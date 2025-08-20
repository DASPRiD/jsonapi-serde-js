import "./augment.js";
import { JsonApiError, type JsonApiErrorObject } from "@jsonapi-serde/server/common";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import { ValidationError, type ValidationErrorSource } from "@taxum/core/extract";
import { type HttpResponse, TO_HTTP_RESPONSE } from "@taxum/core/http";
import { ClientError, type ErrorHandler } from "@taxum/core/util";

/**
 * Maps various error types to a JSON:API error object.
 *
 * Determines if the error details can be safely exposed to clients.
 */
const getJsonApiError = (error: unknown): [JsonApiError, boolean] => {
    if (error instanceof ValidationError) {
        return [
            new JsonApiError(
                error.issues.map((issue): JsonApiErrorObject => {
                    return {
                        status: error.source === "body" ? "422" : "400",
                        code: "validation_failed",
                        title: "Validation failed",
                        detail: error.message,
                        source: getStandardSchemaSource(error.source, issue.path),
                    };
                }),
            ),
            true,
        ];
    }

    if (error instanceof ClientError) {
        return [
            new JsonApiError({
                status: error.status.code.toString(),
                code: error.status.phrase.toLowerCase().replace(/ /g, "_"),
                title: error.status.phrase,
                detail: error.message,
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

const getStandardSchemaSource = (
    source: ValidationErrorSource,
    path: readonly (PropertyKey | StandardSchemaV1.PathSegment)[] | undefined,
): JsonApiErrorObject["source"] | undefined => {
    if (!path || source === "path") {
        return undefined;
    }

    if (source === "body") {
        return { pointer: `/${path.join("/")}` };
    }

    if (path.length === 0) {
        return undefined;
    }

    if (source === "header") {
        return typeof path[0] === "string" ? { header: path[0] } : undefined;
    }

    return {
        parameter: `${path[0].toString()}${path
            .slice(1)
            .map((element) => `[${element.toString()}]`)
            .join()}`,
    };
};

export type JsonApiErrorHandlerOptions = {
    /**
     * Optional error logger callback.
     */
    logError?: (error: unknown, exposed: boolean) => void;
};

/**
 * Error handler which converts any error into a JSON:API error response.
 *
 * Supports optional error logging via the `logError` callback.
 */
export const jsonApiErrorHandler =
    (options?: JsonApiErrorHandlerOptions): ErrorHandler =>
    (error: unknown): HttpResponse => {
        const [jsonApiError, exposed] = getJsonApiError(error);
        options?.logError?.(error, exposed);

        return jsonApiError[TO_HTTP_RESPONSE]();
    };
