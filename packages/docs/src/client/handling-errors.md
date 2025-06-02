# Handling Errors

When working with JSON:API endpoints, non-successful HTTP responses often return error documents conforming to the
JSON:API spec. This library provides a helper function, `handleJsonApiError`, to simplify handling these cases.

## What `handleJsonApiError` Does

- For successful responses (`response.ok === true`), it does nothing.
- For error responses (`response.ok === false`), it:
  - Checks the `Content-Type` header starts with `application/vnd.api+json`.
  - Parses and validates the JSON body as a JSON:API error document.
  - Throws a `JsonApiError` with:
    - The HTTP status code
    - The parsed array of error objects
    - Optional meta information
  - Throws a generic `Error` if the content type is invalid.
  - Throws a `$ZodError` if the error document JSON is invalid or doesn't meet the JSON:API error schema.

## Example Usage

```ts
import { handleJsonApiError, JsonApiError } from "@jsonapi-serde/client";

const fetchUser = async (id: string) => {
    const response = await fetch(`/api/users/${id}`);
    await handleJsonApiError(response);
    const json = await response.json();
    // Use deserializer or other logic here
};
```
