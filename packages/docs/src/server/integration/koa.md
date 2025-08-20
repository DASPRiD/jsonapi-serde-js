# Koa Integration

This package provides middleware and helpers for integrating `@jsonapi-serde/server` seamlessly with 
[Koa](https://koajs.com/). It simplifies handling JSON:API request parsing, response serialization, and error handling
in your Koa apps.

## Installation

::: code-group

```sh [npm]
$ npm add @jsonapi-serde/integration-koa
```

```sh [pnpm]
$ pnpm add @jsonapi-serde/integration-koa
```

```sh [yarn]
$ yarn add @jsonapi-serde/integration-koa
```

```sh [bun]
$ bun add @jsonapi-serde/integration-koa
```

:::

## Middleware

### `jsonApiRequestMiddleware`

Adds JSON:API content negotiation support by parsing the `Accept` header and exposing acceptable media types on
`ctx.state.jsonApi.acceptableTypes`.

If the `Accept` header is malformed or unsupported, it responds with a JSON:API error document (`400 Bad Request`).

```ts
import Koa from "koa";
import { jsonApiRequestMiddleware } from "@jsonapi-serde/integration-koa";

const app = new Koa();
app.use(jsonApiRequestMiddleware());
```

### `jsonApiErrorMiddleware`

Catches errors thrown during request handling and formats them as JSON:API error documents.

You can optionally provide a logger callback:

```ts
import { jsonApiErrorMiddleware } from "@jsonapi-serde/integration-koa";

app.use(jsonApiErrorMiddleware({
    logError: (error, exposed) => {
        if (!exposed) {
            console.error(error);
        }
    }
}));
```

## Request & Response Helpers

### `bodyContext(ctx: Koa.Context): BodyContext`

Extracts the raw request body and `Content-Type` header from the Koa context into a shape suitable for use with
`@jsonapi-serde/server` parsers.

```ts
import { bodyContext } from "@jsonapi-serde/integration-koa";

const parsed = parseResourceRequest(
    bodyContext(ctx),
    { type: "article", attributesSchema: articleAttributesSchema }
);
```

::: info NOTE

You must use Koa's `bodyParser` before this helper.

:::

### `sendJsonApiResponse(ctx: Koa.Context, document: JsonApiDocument)`

Sends a JSON:API response document, sets status, body, and `Content-Type` header accordingly.

Automatically validates the `Accept` header media types set by `jsonApiRequestMiddleware`.

::: info NOTE

You must use `jsonApiRequestMiddleware` before this helper.

:::

## Integration with koa-tree-router

The package provides `treeRouterMethodNotAllowedHandler` to handle unsupported HTTP methods on routes, returning proper
JSON:API errors.

```ts
import { treeRouterMethodNotAllowedHandler } from "@jsonapi-serde/integration-koa/tree-router";
import Router from "koa-tree-router";

const router = new Router({ onMethodNotAllowed: treeRouterMethodNotAllowedHandler });
```

## Full Example

```ts
import Koa from "koa";
import Router from "koa-tree-router";
import { bodyParser } from "@koa/bodyparser";
import {
    jsonApiRequestMiddleware,
    jsonApiErrorMiddleware,
    bodyContext,
    sendJsonApiResponse,
    treeRouterMethodNotAllowedHandler
} from "@jsonapi-serde/integration-koa";
import { parseResourceRequest, SerializeBuilder } from "@jsonapi-serde/server";
import { z } from "zod";
import { SerializeBuilder } from "./serializer";

const app = new Koa();
const router = new Router({onMethodNotAllowed: treeRouterMethodNotAllowedHandler});

// Populate your entity serializers
const serialize = SerializeBuilder.new().build();

const articleAttributesSchema = z.object({
    title: z.string(),
    content: z.string(),
});

app.use(jsonApiRequestMiddleware());
app.use(jsonApiErrorMiddleware());
app.use(bodyParser());

router.post("/articles", async (context) => {
    const {attributes} = parseResourceRequest(bodyContext(context), {
        type: "article",
        attributesSchema: ArticleSchema,
    });

    const savedArticle = {
        id: "1",
        ...attributes,
    };

    sendJsonApiResponse(context, serialize({
        type: "article",
        id: savedArticle.id,
        attributes,
    }));
});

app.use(router.routes());
app.listen(3000);
```
