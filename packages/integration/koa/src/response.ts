import type { JsonApiDocument } from "@jsonapi-serde/server/common";
import type { ParameterizedContext } from "koa";
import type { JsonApiContextState } from "./middleware.js";

/**
 * Sends a JSON:API response using the given Koa context and JSON:API document
 *
 * This function sets the HTTP status, response body, and content-type headers according to the provided JSON:API
 * document. It also verifies that the client's Accept header matches the media types supported by the document.
 *
 * The function requires that the `jsonApiRequestMiddleware` has been registered on the Koa app to populate
 * `context.state.jsonApi` with the acceptable media types.
 *
 * @throws {JsonApiError} when the document's media type is not acceptable by the client.
 *
 * @example
 * ```ts
 * import { sendJsonApiResponse } from "./response";
 * import { jsonApiRequestMiddleware } from "./middleware";
 *
 * app.use(async (context) => {
 *   const document = {}; // Serialized document
 *   sendJsonApiResponse(context, document);
 * });
 * ```
 */
export const sendJsonApiResponse = (
    context: ParameterizedContext<Partial<JsonApiContextState>>,
    document: JsonApiDocument,
): void => {
    if (!context.state.jsonApi) {
        throw new Error("You must register `jsonApiRequestMiddleware` in Koa");
    }

    document.verifyAcceptMediaType(context.state.jsonApi.acceptableTypes);

    context.status = document.getStatus();
    context.body = document.getBody();
    context.set("content-type", document.getContentType());
};
