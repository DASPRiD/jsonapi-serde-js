# Query Parameters

JSON:API query parameters let clients control what data is returned, including related resources, sorting, filtering,
pagination, and sparse fieldsets.

`@jsonapi-serde/openapi` can generate OpenAPI query parameter schemas using the same options as
[`createQueryParser`](/server/parsing-query-parameters).

These options include configuring allowed `include` paths, `sort` fields, sparse `fields`, and Zod schemas for `filter`
and `page`.

Using this, you get type-safe, validated query parameters and full OpenAPI specs with minimal effort.

## Example

```ts
import { buildQueryParameters } from '@jsonapi-serde/openapi';
import { OpenApiBuilder, type ParameterObject } from 'openapi3-ts/oas31';
import { z } from "zod/v4";

// Define your query options (matching createQueryParser)
const queryOptions = {
  include: { allowed: ['author', 'comments'] },
  sort: { allowed: ['title', 'date'] },
  filter: z.object({ published: z.boolean().optional() }).optional(),
};

// Generate the query parameters
const queryParams: ParameterObject[] = buildQueryParameters(queryOptions);

// Build a an OpenAPI spec using openapi3-ts
const spec = OpenApiBuilder
    .create()
    .addPath("/articles", {
        get: {
            summary: 'List articles',
            parameters: queryParams,
            responses: {
                '200': {
                    description: 'A list of articles',
                    content: {
                        'application/vnd.api+json': {
                            schema: {
                                type: 'object'
                                /* ... your response schema here ... */
                            },
                        },
                    },
                },
            },
        }
    })
    .getSpec();
```
