# Parsing Query Parameters

To parse and validate JSON:API query strings (e.g. from a URL or request), use the `createQueryParser` function from
`@jsonapi-serde/server/request`. It supports structured and typed parsing of:

- `include`
- `fields`
- `sort`
- `filter`
- `page`

## Usage Example

```ts
import { createQueryParser } from "@jsonapi-serde/server/request";
import { z } from "zod/v4";

// Create a parser for a specific resource
const parseArticleQuery = createQueryParser({
    include: {
        allowed: ["author", "comments.author"],
    },
    sort: {
        allowed: ["title", "createdAt"],
        multiple: false,
    },
    fields: {
        allowed: {
            articles: ["title", "body"],
            users: ["name"],
        },
    },
    filter: z.object({
        published: z.enum(["true", "false"]),
    }),
    page: z.object({
        number: z.coerce.number().int().min(0),
        size: z.coerce.number().int().min(1),
    }),
});

// Parse a query string
const query = parseArticleQuery("include=comments.author&sort=-createdAt&page[number]=1&page[size]=10");

// Access parsed and validated values
console.log(query.include); // ["comments.author"]
console.log(query.sort);    // [{ field: "createdAt", order: "desc" }]
console.log(query.fields);  // { articles: ["title", "body"], users: ["name"] }
console.log(query.filter);  // { published: "true" }
console.log(query.page);    // { number: "1", size: "10" }
```

::: tip NOTE

Returned results and allowed default values are inferred from the list of allowed values if possible. This works great
when you define the arrays right in the `createQueryParser` call, but fails if you define them in a variable outside.

In that case you need to mark the variable `as const` in order to get proper type inference:

```ts
const allowedInclude = ["author", "comments.author"] as const;

const parseArticleQuery = createQueryParser({
    include: { allowed: allowedInclude }
});
```

:::

## Type-safe Result

The return value is fully typed:

```ts
type ParseQueryResult = {
    include: ("author" | "comments" | "comments.author")[];
    sort: { field: "title" | "createdAt"; order: "asc" | "desc" }[];
    fields: {
        articles?: ("title" | "body")[];
        users?: ("name")[];
    };
    filter: { published: "true" | "false" };
    page: { number: number; size: number };
};
```

## Notes

- If a query parameter is omitted, defaults (if defined) will be applied.
- Invalid paths, field names, or values will throw a `ZodValidationError`, which includes precise error metadata.
- Omitting an option for a query parameter will forbid the client from supplying that value.
