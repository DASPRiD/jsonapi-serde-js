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

## Key Points

- `resourceSchema` is the core resource schema describing the resource(s) returned in `data`.
- `cardinality` specifies if `data` holds one resource (`one`), an array of resources (`many`), or a nullable resource
  (`one_nullable`).
- `meta` and `links` are optional additional JSON:API top-level members with their own schemas.
- `included` is an optional array of related resource schemas that may appear in the `included` top-level member.

## Integration

Use the returned response object in your OpenAPI document under the relevant response code, for example:

```ts
const responses = {
    200: buildDataResponseObject({ ... })
};
```
