# Error Handling

This library provides structured, JSON:API-compliant error handling via the `JsonApiError` and `ZodValidationError` 
classes.

These errors are thrown by the library itself (e.g. when parsing fails), but **you can and should also use them in your
own application code** to generate consistent error responses.

:::warning
These classes **do not extend `Error`** to avoid capturing stack traces. This is a deliberate performance
optimization, especially important for high-throughput APIs.
:::

## JSON:API Errors

The core error type is `JsonApiError`, which wraps one or more
[`JsonApiErrorObject`](https://jsonapi.org/format/#errors) instances. It automatically infers a suitable HTTP status
code and can be converted to a JSON:API document via `.toDocument()`.

### Example: throwing and handling a `JsonApiError`

```ts
import { JsonApiError } from "@jsonapi-serde/server/common";

// Error-handling middleware
app.use((err, req, res, next) => {
    if (err instanceof JsonApiError) {
        const document = err.toDocument();

        res
            .status(document.getStatus())
            .set("Content-Type", document.getContentType())
            .json(document.getBody());
    } else {
        next(err); // fallback
    }
});

app.get("/resource", (req, res, next) => {
    throw new JsonApiError({
        status: "404",
        title: "Not Found",
        detail: "The requested resource does not exist.",
    });
});
```

### Important Notes

- Do not perform `Accept` validation inside your error middleware, as errors may stem from unacceptable media types.
- These errors are designed to be consistent and serializable.
- Use the provided `document.getStatus()`, `getContentType()`, and `getBody()` helpers when returning errors to clients.
