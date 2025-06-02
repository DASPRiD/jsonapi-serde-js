# Parsing Request Bodies

This library provides robust tools for validating and extracting data from incoming JSON:API resource and relationship
requests. The goal is to ensure strong typing, clean separation of concerns, and helpful, standard-compliant error
reporting; all while maintaining runtime performance.

- `include`
- `fields`
- `sort`
- `filter`
- `page`

## Overview

Body parsing includes:

- Enforcing content-type requirements (`application/vnd.api+json`)
- Decoding and validating the JSON structure
- Ensuring resource identifiers, types, attributes, and relationships match expected schemas
- Optional validation of `included` resources and relationships
- Returning parsed and typed resource data in a usable form

## Input Context

To parse a body, you must provide a BodyContext:

```ts
type BodyContext = {
    body: Record<string, unknown> | string;
    contentType: string;
};
```

The `body` may be a raw JSON string (e.,g. from `req.body`) or an already-parsed object.

## Content Type Validation

When parsing a request, it is automatically ensured that the `Content-Type` header:

- Is present and equals `application/vnd.api+json`
- Does not contain unknown media type parameters

Invalid content types throw a `JsonApiError` with status 415.

## Parsing Resource Requests

Use `parseResourceRequest` to handle resource creation and update requests, typically for endpoints like
`POST /articles` or `PATCH /articles/:id`.

You must specify the expected resource `type`, and optionally provide Zod schemas for:

- the resource `id` (for `PATCH` and `PUT`)
- `attributes`
- `relationships`
- any `included` resource types

### Example

```ts
import { 
    parseResourceRequest,
    relationshipSchema,
    resourceIdentifierSchema,
} from "@jsonapi-serde/server/request";
import { z } from "zod/v4";

const result = parseResourceRequest(context, {
    type: "article",
    idSchema: z.uuid(),
    attributesSchema: z.strictObject({
        title: z.string(),
        content: z.string(),
    }),
    relationshipsSchema: z.strictObject({
        author: relationshipSchema(resourceIdentifierSchema("person")),
    }),
});
```

This returns a typed result:

```ts
type Result = {
    id: string;
    type: "article";
    attributes: {
        title: string;
        content: string;
    };
    relationships: {
        author: {
            data: { type: "person", id: string };
        };
    };
};
```

### Relationships

Relationships can be defined as to-one, nullable to-one or to-many:

#### To-One

```ts
relationshipSchema(resourceIdentifierSchema("person"))
```

#### Nullable To-One

```ts
relationshipSchema(resourceIdentifierSchema("person").nullable())
```

#### To-Many

```ts
relationshipSchema(resourceIdentifierSchema("person").array())
```

### Included resources

A client may include related resources in the request using the top-level `included` array. These included resources
can be validated using the `includedTypeSchemas` option in `parseResourceRequest`.

Each entry in `includedTypeSchemas` can provide at an `attributesSchema` and a `relationshipsSchema`. All included
resources must have a `lid` (local identifier) so they can be referenced from the main `data` relationships.

#### Example payload with `included`

```json
{
    "data": {
        "type": "article",
        "attributes": { "title": "My Post", "content": "..." },
        "relationships": {
            "author": {
                "data": { "type": "person", "lid": "temp-1" }
            }
        }
    },
    "included": [
        {
            "type": "person",
            "lid": "temp-1",
            "attributes": { "name": "Jane Doe" }
        }
    ]
}
```

To validate this, use `clientResourceIdentifierSchema()` to allow lid-based references:

```ts
import { 
    parseResourceRequest,
    relationshipSchema,
    clientResourceIdentifierSchema,
} from "@jsonapi-serde/server/request";

const result = parseResourceRequest(context, {
    type: "article",
    attributesSchema: z.object({
        title: z.string(),
        content: z.string(),
    }),
    relationshipsSchema: z.object({
        author: relationshipSchema(clientResourceIdentifierSchema("person")),
    }),
    includedTypeSchemas: {
        person: {
            attributesSchema: z.object({
                name: z.string(),
            }),
        },
    },
});
```

This setup allows `author.data` to refer to a person by lid, and ensures that the included person resource is present
and valid.

#### Supporting Both Server and Client Identifiers

If you want to support both client-provided local identifiers (`lid`) and traditional server-side identifiers (`id`),
you can use a union of `resourceIdentifierSchema` and `clientResourceIdentifierSchema`:

```ts
relationshipSchema(
    resourceIdentifierSchema("person").or(
        clientResourceIdentifierSchema("person")
    )
)
```

This allows the relationship to use either:

```json
{ "type": "person", "id": "abc-123" }
```

or 

```json
{ "type": "person", "lid": "temp-1" }
```

whichever the client provides. This is useful for cases where you allow both new and existing related resources in the
same API call.

## Parsing Relationship Requests

Use `parseRelationshipRequest` to handle relationship updates or deletions, such as:

- `PATCH /articles/1/relationships/author` (to-one)
- `PATCH /articles/1/relationships/tags` (to-many)
- `DELETE /articles/1/relationships/editor` (removal)

Refer to the [JSON:API specificaiton](https://jsonapi.org/format/#crud-updating-relationships) for relationship update
semantics.

### To-One: `parseRelationshipRequest`

Parses a to-one relationship request and returns a validated ID or `null`.

```ts
const authorId = parseRelationshipRequest(context, "person");
// authorId: string
```

#### With ID Validation

```ts
const editorId = parseRelationshipRequest(context, "person", z.uuid());
// editorId: string (validated as UUID)
```

#### Nullable Relationships

To allow unsetting the relationship, use `.nullable()`:

```ts
const editorId = parseRelationshipRequest(context, "person", z.uuid().nullable());
// editorId: string | null
```

#### Example Request Body

```json
{
    "data": {
        "type": "person",
        "id": "f27aa413-8ab2-4981-9351-e8e7c2244795"
    }
}
```

Unsetting the relationship:

```json
{
    "data": null
}
```

### To-Many: `parseRelationshipsRequest`

```ts
const tagIds = parseRelationshipsRequest(context, "tag");
// tagIds: string[]
```

#### With ID Validation

```ts
const tagIds = parseRelationshipsRequest(context, "tag", z.uuid());
// tagIds: string[]
```

#### Example Request Body

```json
{
    "data": [
        { "type": "tag", "id": "a1" },
        { "type": "tag", "id": "b2" }
    ]
}
```
