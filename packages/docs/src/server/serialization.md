# Serialization

Serialization transforms internal entity models into JSON:API-compliant documents. This system is type-safe, extensible,
and supports full or partial inclusion of related resources, sparse fieldsets, and custom metadata.

Serialization is powered by **entity serializers**, which describe how to convert an entity into a JSON:API resource
object.

## Defining a Serializer

Each entity serializer defines two methods:
To create a serializer:

- `getd(entity)`: returns the resource's string ID
- `serialize(entity, context?)`: returns a partial JSON:API resource object

```ts
import type { EntitySerializer } from "@jsonapi-serde/server/response";

const articleSerializer: EntitySerializer<Article> = {
    getId: (article) => article.id,
    serialize: (article) => ({
        attributes: {
            title: article.title,
            content: article.content,
        },
        relationships: {
            author: {
                data: {
                    type: "user",
                    id: article.author.id,
                    // Optional, enables inclusion
                    entity: article.author,
                },
            },
        },
    }),
};
```

### Optional Properties

The object returned by `serialize()` can include:

- `attributes`
- `relationships`
- `meta`
- `links`

### Relationship Data

The `data` field of a relationship may be:

- A single resource identifier:<br />
  ``` { type: "users", id: "42" }``` 
- An array of resource identifiers:<br />
  ``` [ { type: "tags", id: "1" }, { type: "tags", id: "2" } ]```
- `null`, to represent an empty to-one relationship

If a related entity is included under `entity` and a serializer for that type has been registered, it will be added to
the top-level included array (if requested via include).

::: tip NOTE

By default, you will not get type checking against the `type` property. To enable type checking, you have to do two
things. First you need to export the a `SerializeMap` for your global `serialize` function:

```ts
import type { InferSerializeMap } from "@jsonapi-serde/server/response";

export type SerializeMap = InferSerializeMap<typeof serialize>;
```

Then in your serializer definitions, you can do this:

```ts
import type { SerializedEntity } from "@jsonapi-serde/server/response";

const articleSerializer: EntitySerializer<Article> = {
    getId: (article) => article.id,
    serialize: (article, context) => ({
        /* Your definitions */
    }) satisfies SerializedEntity<SerializeMap>,
};
```

:::

## Serializer Context

Serializers receive an optional `context` parameter to customize serialization logic.

The context is an object whose shape is determined by the user and passed down through the entire serialization process.
It can be used to:

- Include user permissions or roles to conditionally include/exclude fields
- Provide localization or formatting options
- Pass request-specific flags or metadata

For example:

```ts
type MyContext = {
    locale: string;
};

const articleSerializer: EntitySerializer<Article, MyContext> = {
    getId: (article) => article.id,
    serialize: (article, context) => ({
        attributes: {
            title: context?.locale === "fr" ? article.titleFr : article.title,
            content: article.content,
        },
    }),
};
```

When calling the serializer, context can be provided via the `SerializeOptions.context` property:

```ts
const doc = serialize("article", article, {
    context: {
        articles: { locale: "en" },
    },
});
```

This ensures that serializers for the `article` type receive the provided context object.

## Creating a Serialize Function

Use `SerializeBuilder` to build a fully-typed serializer:

```ts
import { SerializeBuilder } from "@jsonapi-serde/server/response";

const serialize = SerializeBuilder
    .new()
    .add("article", articleSerializer)
    .add("user", userSerializer)
    .build();
```

You can now serialize any supported entity:

```ts
const document = serialize("article", article, {
    include: ["author"],
});
```

## Serialize Options

The serializer function accepts an optional options object:

| Option       | Description                                    |
|--------------|------------------------------------------------|
| `context`    | Map of context objects for each resource type  |
| `status`     | HTTP status code to include in the response    |
| `include`    | Array of paths to include in the document      |
| `fields`     | Map of sparse fieldsets for each resource type |
| `links`      | Top-level `links` object                       |
| `meta`       | Top-level `meta` object                        |
| `extensions` | Array of JSON:API extension URIs               |
| `profiles`   | Array of JSON:API profile URIs                 |

### Example

## Using the Output

The returned document conforms to the JSON:API specification, and includes:

- A top-level `jsonapi` object describing version, extension and profiles
- A top-level `data` field with one or more resource objects
- An optional `included` array for related resources
- Optional top-level `meta` and `links` depending on your configuration

## Serializing Resources

The resulting `serialize` function accepts a resource type, an entity (or array of entities or `null`), and optional
serialization options:

```ts
const document = serialize("article", article, {
    include: ["author"],
    fields: {
        articles: ["title"],
        users: ["name"],
    },
});
```

## Integration

Once you've serialized an entity, you'll get back a **JSON:API document** with helper methods to simplify integration
with web frameworks.

Use the following methods on the returned document:

- `.getStatus()`: returns the HTTP status code (defaults to 200)
- `.getContentType()`: returns the correct `Content-Type` with extensions and profiles applied
- `.getBody()`: returns the actual response payload
- `.verifyAcceptMediaType(acceptedMediaTypes)`: verifies that the client accepts the content of this document 

### Express Example

You can create a small utility to send responses consistently:

```ts
import { getAcceptableMediaTypes } from "@jsonapi-serde/server/request";

const sendJsonApiResponse = (req: Request, res: Response, document: JsonApiDocument): void => {
    document.verifyAcceptMediaType(getAcceptableMediaTypes(req.get("Accept")));

    res
          .status(document.getStatus())
          .type(document.getContentType())
          .send(document.getBody());
};
```

Then use the helper in your handlers:

```ts
import { JsonApiError } from "@jsonapi-serde/server/common";

app.get("/articles/:id", async (req, res) => {
    const article = await getArticleById(req.params.id);

    if (!article) {
        throw new JsonApiError({ status: "404", title: "Not found" });
    }

    const document = serializer("article", article, {
        include: ["author"],
    });

    sendJsonApiResponse(req, res, document);
});
```

### Provided Integrations

For convenience, this library provides framework-specific integrations that handle all of the above for you, including:

- **Koa** middleware
- More to come

See the Integrations section for full details.
