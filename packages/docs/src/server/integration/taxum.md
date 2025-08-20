# Taxum Integration

This package provides layers, error handling and request extractors for integrating `@jsonapi-serde/server` seamlessly
with [Taxum](https://github.com/DASPRiD/taxum). It simplifies handling JSON:API content negotiation, request parsing,
and error formatting in your Taxum apps.

## Installation

::: code-group

```sh [npm]
$ npm add @jsonapi-serde/integration-taxum
```

```sh [pnpm]
$ pnpm add @jsonapi-serde/integration-taxum
```

```sh [yarn]
$ yarn add @jsonapi-serde/integration-taxum
```

```sh [bun]
$ bun add @jsonapi-serde/integration-taxum
```

:::

## Initialization

In your entry file, you should import the augmentation module:

```ts
import "@jsonapi-serde/integration-taxum/augment";
```

This augments `JsonApiDocument` and `JsonApiError` to implement `ToHttpResponse`, making them directly usable as handler
return values.

```ts
// works directly as a response
return new JsonApiDocument({ /* ... */ });
```

## Layers and Handlers

A Taxum layer that parses the Accept header, determines acceptable JSON:API media types, and validates that responses
match those types.

Register it **late** in your router's layer stack, ideally after compression, since it may still generate responses.

```ts
import { jsonApiMediaTypesLayer } from "@jsonapi-serde/integration-taxum";

router.layer(jsonApiMediaTypesLayer);
```

## Error Handling

The JSON:API error handler is registered with router.errorHandler():

```ts
import { jsonApiErrorHandler } from "@jsonapi-serde/integration-taxum";

router.errorHandler(jsonApiErrorHandler({
    logError: (err, exposed) => {
        if (!exposed) {
            console.error(err);
        }
    }
}));
```

This handler formats thrown errors into JSON:API error documents. The `logError` option works the same way as in the Koa
integration.

## Fallback Handlers

The package exports notFoundHandler and methodNotAllowedHandler:

```ts
import { notFoundHandler, methodNotAllowedHandler } from "@jsonapi-serde/integration-taxum";

router
    .fallback(notFoundHandler)
    .methodNotAllowedFallback(methodNotAllowedHandler);
```

These return proper JSON:API error responses for missing routes or unsupported methods.

## Extractors

Extractors let you plug JSON:API request parsing directly into your route handlers.

### `jsonApiQuery(parse: QueryParser)`

Extracts query parameters using a JSON:API `QueryParser`.

```ts
import { jsonApiQuery } from "@jsonapi-serde/integration-taxum";
import { createQueryParser } from "@jsonapi-serde/server/request";

const parseQuery = createQueryParser({
    include: {
        allowed: ["author", "comments.author"],
    },
});

router.route("/articles", m.get([jsonApiQuery(parseQuery)], (query) => {
    return listArticles(query);
}));
```

### `jsonApiResource(options, idPathParam?)`

Extracts and parses a JSON:API resource from the request body.

If `idPathParam` is provided, it will validate that the ID in the body matches
the path parameter.

```ts
import { jsonApiResourceRequest } from "@jsonapi-serde/integration-taxum";
import { z } from "zod";

const articleAttributesSchema = z.object({
    title: z.string(),
    content: z.string()
});

router.route(
    "/articles",
    m.post(
        [
            jsonApiResourceRequest({
                type: "article",
                attributesSchema: articleAttributesSchema
            })
        ],
        (resource) => {
            const article = saveArticle(resource.attributes);
            return serialize(article);
        },
    ),
);
```

### Other extractors

- `jsonApiRelationship(type, idSchema?)`: parses a to-one relationship from the body.
- `jsonApiRelationships(type, idSchema?)`: parses a to-many relationship from the body.

## Full Example

```ts
import "@jsonapi-serde/integration-taxum/augment";
import { Router, m } from "@taxum/core/routing";
import { serve } from "@taxum/core/server";
import { z } from "zod";
import {
    jsonApiMediaTypesLayer,
    jsonApiErrorHandler,
    notFoundHandler,
    methodNotAllowedHandler,
    jsonApiQuery,
    jsonApiResourceRequest,
} from "@jsonapi-serde/integration-taxum";
import {
    SerializeBuilder,
    createQueryParser,
} from "@jsonapi-serde/server";

// Populate your entity serializers
const serialize = SerializeBuilder.new().build();

const articleAttributesSchema = z.object({
    title: z.string(),
    content: z.string(),
});

const parseQuery = createQueryParser({
    include: { allowed: ["author", "comments.author"] },
    sort: { allowed: ["title", "createdAt"] },
});

const router = new Router()
    .route(
        "/articles",
        m.get([jsonApiQuery(parseQuery)], (query) => {
            const articles = listArticles(query);
            return serialize(articles);
        }),
    )
    .route(
        "/articles",
        m.post(
            [
                jsonApiResourceRequest({
                    type: "article",
                    attributesSchema: articleAttributesSchema,
                }),
            ],
            (resource) => {
                const savedArticle = saveArticle(resource.attributes);
                return serialize({
                    type: "article",
                    id: savedArticle.id,
                    attributes: resource.attributes,
                });
            },
        ),
    )
    .errorHandler(jsonApiErrorHandler({
        logError: (err, exposed) => {
            if (!exposed) {
                console.error(err);
            }
        }
    }))
    .fallback(notFoundHandler)
    .methodNotAllowedFallback(methodNotAllowedHandler)
    .layer(jsonApiMediaTypesLayer);

serve(router, { port: 3000 });
```
