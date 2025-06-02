import type { BodyContext } from "@jsonapi-serde/core/request";
import type { Context as KoaContext } from "koa";

type BodyParserKoaContext = KoaContext & {
    request: {
        body?: unknown;
    };
};

/**
 * Extracts a `BodyContext` from a Koa context for JSON:API request parsing
 *
 * This function reads the request body and content-type header from the Koa context and validates that the body is
 * either a string or an object.
 *
 * @throws {Error} If the body is neither a string nor a non-null object.
 *
 * @example
 * ```ts
 * import { bodyContext } from "@jsonapi-serde/koa";
 *
 * app.use(async (ctx, next) => {
 *   const context = bodyContext(ctx);
 * });
 * ```
 */
export const bodyContext = (koaContext: BodyParserKoaContext): BodyContext => {
    const body = koaContext.request.body;

    if ((typeof body !== "string" && typeof body !== "object") || body === null) {
        throw new Error("Body must either be a string or an object");
    }

    return {
        body: body as string | Record<string, unknown>,
        contentType: koaContext.get("Content-Type"),
    };
};
