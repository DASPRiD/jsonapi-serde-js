# Data Responses

This page explains how to generate OpenAPI 3.1 response objects for JSON:API data responses.

## Building Data Response Objects

Use the `buildDataResponseObject` function to generate a complete OpenAPI response object describing a JSON:API response
with a `data` key, plus optional `meta`, `links`, and `included` fields.

```ts
import { buildDataResponseObject } from "@jsonapi-serde/openapi";
import { z } from "zod/v4";

const articleSchema = {
    type: "object",
    properties: {
        id: { type: "string" },
        type: { type: "string", enum: ["articles"] },
        attributes: {
            type: "object",
            properties: {
                title: { type: "string" },
                body: { type: "string" },
            },
            required: ["title"],
        },
    },
    required: ["id", "type", "attributes"],
};

const response = buildDataResponseObject({
    resourceSchema: articleSchema,
    cardinality: "one", // single resource; use "many" for arrays
    description: "A single article resource",
    meta: {
        type: "object",
        properties: {
            page: { type: "integer" },
            total: { type: "integer" },
        },
        required: ["page", "total"],
    },
    links: {
        self: { type: "string", format: "uri" },
        related: { type: "string", format: "uri" },
    },
    included: [
        {
            type: "object",
            properties: {
                id: { type: "string" },
                type: { type: "string", enum: ["people"] },
                attributes: {
                    type: "object",
                    properties: {
                        name: { type: "string" },
                    },
                    required: ["name"],
                },
            },
            required: ["id", "type", "attributes"],
        },
    ],
});
```

## Building Resource Schemas

The `resourceSchema` above is written out by hand. `buildResourceSchemaObject` builds the same shape from the parts of a
JSON:API resource, so the `id` and `type` members and their `required` entries come out consistent across every
resource you describe.

```ts
import { buildResourceSchemaObject } from "@jsonapi-serde/openapi";

const articleSchema = buildResourceSchemaObject({
    type: "article",
    id: { type: "string", format: "uuid" },
    attributes: {
        type: "object",
        properties: {
            title: { type: "string" },
            body: { type: "string" },
        },
        required: ["title", "body"],
        additionalProperties: false,
    },
    relationships: [
        {
            name: "author",
            type: "person",
            cardinality: "one",
        },
        {
            name: "comments",
            type: "comment",
            cardinality: "many",
            optional: true,
        },
    ],
});
```

`cardinality` takes `one`, `one_nullable` or `many`, and shapes the relationship's `data` member accordingly.

## Optional Relationships

Every declared relationship is required by default, and so is the `relationships` member itself. Mark a relationship
`optional` when a response does not always carry it, which is the case whenever the server serves it only on request,
such as one outside the default sparse fieldset. An OpenAPI schema cannot vary with a query parameter, so the
`required` entries describe the response a client gets without asking for anything. The relationship itself stays in
`properties`, so a response that does carry it still matches.

A to-many relationship is the common case: its linkage needs the related collection loaded, so a server that loads it
only on request cannot promise it. A to-one usually can, since the foreign key is already on the resource.

If every declared relationship is optional, the `relationships` member is not required either, and no `required` array
is emitted for it.

## Key Points

- `resourceSchema` is the core resource schema describing the resource(s) returned in `data`.
- `cardinality` specifies if `data` holds one resource (`one`), an array of resources (`many`), or a nullable resource
  (`one_nullable`).
- `meta` and `links` are optional additional JSON:API top-level members with their own schemas.
- `included` is an optional array of related resource schemas that may appear in the `included` top-level member.
- `buildResourceSchemaObject` assembles a resource schema from its parts.
- A relationship marked `optional` is left out of the `required` array under `relationships`.

## Integration

Use the returned response object in your OpenAPI document under the relevant response code, for example:

```ts
const responses = {
    200: buildDataResponseObject({ ... })
};
```
