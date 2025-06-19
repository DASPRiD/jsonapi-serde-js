import type { $ZodIssue } from "zod/v4/core";
import type { JsonApiErrorObject } from "./json-api.js";
import { JsonApiDocument } from "./response.js";

/**
 * A JSON:API-compliant error wrapper
 *
 * Accepts one or more `JsonApiErrorObject` instances and provides status inference and document transformation.
 */
export class JsonApiError {
    public readonly errors: JsonApiErrorObject[];
    public readonly status: number;

    /**
     * Creates a new `JsonApiError` from one or more error objects
     *
     * Automatically infers a suitable HTTP status code.
     *
     * @throws {Error} when no errors are supplied
     */
    public constructor(errors: JsonApiErrorObject | JsonApiErrorObject[]) {
        this.errors = Array.isArray(errors) ? errors : [errors];

        if (this.errors.length === 0) {
            throw new Error("At least one error must be supplied");
        }

        this.status = JsonApiError.determineStatusCode(this.errors);
    }

    /**
     * Determines the appropriate HTTP status code from the error set
     *
     * Falls back to 500 or 400 based on presence and severity of error codes.
     * A warning is emitted when no status codes were defined.
     */
    private static determineStatusCode = (errors: JsonApiErrorObject[]): number => {
        const uniqueStatusCodes = [
            ...new Set(
                errors
                    .map((error) => error.status)
                    .filter((value): value is string => value !== undefined)
                    .map((value) => Number.parseInt(value, 10)),
            ),
        ];

        if (uniqueStatusCodes.length === 0) {
            console.warn("No error contained a status code, falling back to 500");
            return 500;
        }

        if (uniqueStatusCodes.length === 1) {
            return uniqueStatusCodes[0];
        }

        if (uniqueStatusCodes.some((statusCode) => statusCode >= 500 && statusCode < 600)) {
            return 500;
        }

        return 400;
    };

    /**
     * Converts the error into a full JSON:API error document
     */
    public toDocument(): JsonApiDocument {
        return new JsonApiDocument(
            {
                errors: this.errors,
            },
            this.status,
        );
    }
}

/**
 * Structured metadata that can be attached to a Zod issue to influence JSON:API output
 */
export class ZodValidationErrorParams {
    /** Custom error code to override Zod’s default for custom errors */
    public readonly code: string;

    /** Optional detailed explanation of the error */
    public readonly detail: string | undefined;

    /** Optional HTTP status code (e.g., 400 or 422) */
    public readonly status: number | undefined;

    public constructor(code: string, detail?: string, status?: number) {
        this.code = code;
        this.detail = detail;
        this.status = status;
    }
}

/**
 * Translates Zod validation issues into a JSON:API error document
 */
export class ZodValidationError extends JsonApiError {
    public constructor(errors: $ZodIssue[], source: "query" | "body") {
        super(
            errors.map((error): JsonApiErrorObject => {
                const params =
                    error.code === "custom" && error.params instanceof ZodValidationErrorParams
                        ? error.params
                        : null;

                const { code, input, path, message, ...rest } = error;
                const meta = params
                    ? Object.fromEntries(Object.entries(rest).filter(([key]) => key !== "params"))
                    : rest;

                return {
                    status: params?.status?.toString() ?? (source === "query" ? "400" : "422"),
                    code: params?.code ?? code,
                    title: message,
                    detail: params?.detail,
                    source: ZodValidationError.getSource(source, path),
                    meta: Object.keys(meta).length > 0 ? meta : undefined,
                };
            }),
        );
    }

    /**
     * Resolves the `source` field of a JSON:API error based on Zod’s path
     */
    private static getSource(
        errorSource: "query" | "body",
        path: PropertyKey[],
    ): JsonApiErrorObject["source"] {
        if (errorSource === "body") {
            return { pointer: `/${path.join("/")}` };
        }

        if (path.length === 0) {
            return undefined;
        }

        return {
            parameter: `${path[0].toString()}${path
                .slice(1)
                .map((element) => `[${element.toString()}]`)
                .join()}`,
        };
    }
}
