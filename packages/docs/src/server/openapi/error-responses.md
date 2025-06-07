# Error Responses

This page shows how to generate OpenAPI 3.1 response objects for JSON:API error responses.

## Building Error Response Objects

Use the `buildErrorResponseObject` function to create an OpenAPI response object describing an error response with an
`errors` array per the JSON:API specification.

```ts
import { buildErrorResponseObject } from "@jsonapi-serde/openapi";

const errorResponse = buildErrorResponseObject({
    description: "Resource not found",
});
```

The generated schema defines an `errors` array where each item is an object with the following properties:

- `status` (required): HTTP status code as a string.
- `code`: Application-specific error code.
- `title`: Short summary of the error.
- `detail`: Detailed error message.
- `source`: Optional object indicating the source of the error with `pointer`, `parameter`, and `header` fields.

## Example Usage in OpenAPI

Use the response object in your OpenAPI spec like this:

```ts
const responses = {
    404: buildErrorResponseObject({ description: "Resoruce not found" })
};
```

## Why Use This?

- Provides a consistent, standard JSON:API error response schema.
- Easily integrates with OpenAPI tooling and documentation.
- Ensures your API documentation matches the JSON:API spec for errors.

