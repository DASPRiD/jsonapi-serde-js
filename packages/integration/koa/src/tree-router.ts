import { JsonApiError } from "@jsonapi-serde/server/common";
import type { Context } from "koa";

type BaseContext = Pick<Context, "response" | "remove" | "status" | "body">;

/**
 * Handles HTTP method not allowed or resource not found errors for koa-tree-router
 *
 * This function inspects the `Allow` header of the response:
 * - If it is empty, it means no allowed methods exist, so it removes the header and throws a 404 Not Found JSON:API
 *   error.
 * - Otherwise, it throws a 405 Method Not Allowed JSON:API error including the allowed methods in the error detail.
 *
 * Intended for use as a fallback handler when a request uses an HTTP method* that is not supported on the resource.
 *
 * @example
 * ```ts
 * import Router from "koa-tree-router";
 * import { treeRouterMethodNotAllowedHandler } from "@jsonapi-serde/koa";
 *
 * const router = Router({ onMethodNotAllowed: treeRouterMethodNotAllowedHandler });
 * ```
 */
export const treeRouterMethodNotAllowedHandler = <TContext extends BaseContext>(
    context: TContext,
) => {
    if (context.response.headers.allow === "") {
        context.remove("allow");

        throw new JsonApiError({
            status: "404",
            code: "not_found",
            title: "Resource not found",
        });
    }

    throw new JsonApiError({
        status: "405",
        code: "method_not_allowed",
        title: "Method not allowed",
        detail: `Allowed methods: ${context.response.headers.allow}`,
    });
};
