# Data Requests

This page shows how to generate OpenAPI 3.1 request bodies for JSON:API data requests using `@jsonapi-serde/openapi` utilities.

## Resource Requests

Resource requests typically include a `data` object describing the resource with `type`, and optionally `id`, `attributes`, and `relationships`.

The function `buildResourceRequestContentObject` takes a set of parser options and converts them into an OpenAPI `ContentObject` describing the request body schema.

```ts
import { buildResourceRequestContentObject } from "@jsonapi-serde/openapi";
import { z } from "zod/v4";

// Example options with Zod schemas for attributes and relationships
const options = {
    type: "articles",
    idSchema: z.uuid(),
    attributesSchema: z.object({
        title: z.string(),
        body: z.string().optional(),
    }),
    relationshipsSchema: z.object({
        author: z.object({
            data: z.object({
                type: z.literal("people"),
                id: z.string(),
            }),
        }),
    }),
    includedTypeSchemas: {
        people: {
            attributesSchema: z.object({
                name: z.string(),
            }),
        },
    },
};

const content = buildResourceRequestContentObject(options);
```

This `content` object can be assigned to an OpenAPI request body to validate and document JSON:API resource requests.

### Resulting schema highlights:

- The root object has a required `data` property
- `data` contains required `type` and optional `id`, `attributes`, and `relationships` as specified
- If `includedTypeSchemas` is provided, an included array is added describing related resource objects with their own
  schemas

## Relationships Requests

To describe requests that update relationships (which typically include a `data` array of resource identifiers), use
`buildRelationshipsRequestContentObject`.

```ts
import { buildRelationshipsRequestContentObject } from "@jsonapi-serde/openapi";
import { z } from "zod/v4";

const type = "tags";
const idSchema = z.uuid();

const content = buildRelationshipsRequestContentObject(type, idSchema);
```

This generates an OpenAPI `ContentObject` with a schema requiring:

- a `data` array of objects each having:
  - a `type` matching the specified resource type (e.g., `tags`)
  - an `id` validated by the provided Zod schema or defaulting to string

## Summary

These utilities bridge your Zod-based query/resource parsing definitions and OpenAPI JSON Schemas, enabling you to
automatically generate comprehensive, correct request body schemas for JSON:API endpoints.

You can then integrate these content objects into your OpenAPI document for complete and accurate API documentation.
