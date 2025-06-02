import { JsonApiError } from "@jsonapi-serde/core/common";
import {
    type JsonApiMediaType,
    ParserError,
    getAcceptableMediaTypes,
} from "@jsonapi-serde/core/request";
import { isHttpError } from "http-errors";
import type { Middleware } from "koa";

/**
 * The Koa state shape extended with JSON:API parsing metadata
 */
export type JsonApiContextState = {
    jsonApi: {
        /**
         * List of acceptable JSON:API media types parsed from the `Accept` header
         */
        acceptableTypes: JsonApiMediaType[];
    };
};

/**
 * Middleware that parses and validates the `Accept` header for JSON:API media types
 *
 * On success, adds `acceptableTypes` to `ctx.state.jsonApi`.
 * On failure, responds with HTTP 400 and a JSON:API error document.
 */
export const jsonApiRequestMiddleware = (): Middleware<Partial<JsonApiContextState>> => {
    return async (context, next) => {
        try {
            context.state.jsonApi = {
                acceptableTypes: getAcceptableMediaTypes(context.get("Accept")),
            };
        } catch (error) {
            if (!(error instanceof ParserError)) {
                throw error;
            }

            const document = new JsonApiError({
                status: "400",
                code: "bad_request",
                title: "Bad Request",
                detail: error.message,
                source: {
                    header: "accept",
                },
            }).toDocument();

            context.set("Content-Type", document.getContentType());
            context.status = document.getStatus();
            context.body = document.getBody();
            return;
        }

        return next();
    };
};

type ErrorMiddlewareOptions = {
    /**
     * Optional error logger callback
     */
    logError?: (error: unknown, exposed: boolean) => void;
};

/**
 * Maps various error types to a JSON:API error object
 *
 * Determines if the error details can be safely exposed to clients.
 */
const getJsonApiError = (error: unknown): [JsonApiError, boolean] => {
    if (isHttpError(error) && error.expose) {
        return [
            new JsonApiError({
                status: error.status.toString(),
                code: error.name
                    .replace(/Error$/, "")
                    .replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
                    .replace(/^_+|_+$/g, ""),
                title: error.message,
            }),
            true,
        ];
    }

    if (
        error instanceof Error &&
        "status" in error &&
        typeof error.status === "number" &&
        error.status >= 400 &&
        error.status < 500
    ) {
        return [
            new JsonApiError({
                status: error.status.toString(),
                code: error.name
                    .replace(/Error$/, "")
                    .replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
                    .replace(/^_+|_+$/g, ""),
                title: error.message,
            }),
            true,
        ];
    }

    if (error instanceof JsonApiError) {
        return [error, error.status < 500];
    }

    return [
        new JsonApiError({
            status: "500",
            code: "internal_server_error",
            title: "Internal Server Error",
        }),
        false,
    ];
};

/**
 * Middleware to catch errors thrown during request handling and respond with JSON:API-compliant error documents
 *
 * Supports optional error logging via the `logError` callback.
 */
export const jsonApiErrorMiddleware = (options?: ErrorMiddlewareOptions): Middleware => {
    return async (context, next) => {
        try {
            await next();
        } catch (error) {
            const [jsonApiError, exposed] = getJsonApiError(error);
            options?.logError?.(error, exposed);

            const document = jsonApiError.toDocument();
            context.set("Content-Type", document.getContentType());
            context.status = document.getStatus();
            context.body = document.getBody();
        }
    };
};
