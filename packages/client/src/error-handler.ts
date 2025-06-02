import type { $ZodType } from "zod/v4/core";
import { z } from "zod/v4/mini";
import type { Links, UnknownMeta } from "./common-schema-types.js";
import { linkSchema, unknownMetaSchema } from "./common-schemas.js";

/**
 * Represents a single error object in a JSON:API error document
 */
export type ErrorObject = {
    id?: string;
    links?: Links<"about" | "type">;
    status?: string;
    code?: string;
    title?: string;
    detail?: string;
    source?: {
        pointer?: string;
        parameter?: string;
        header?: string;
    };
    meta?: UnknownMeta;
};

const errorObjectSchema: $ZodType<ErrorObject> = z.object({
    id: z.optional(z.string()),
    links: z.optional(
        z.object({
            about: linkSchema,
            type: linkSchema,
        }),
    ),
    status: z.string(),
    code: z.optional(z.string()),
    title: z.optional(z.string()),
    detail: z.optional(z.string()),
    source: z.optional(
        z.object({
            pointer: z.optional(z.string()),
            parameter: z.optional(z.string()),
            header: z.optional(z.string()),
        }),
    ),
    meta: z.optional(unknownMetaSchema),
});

const errorDocumentSchema = z.object({
    errors: z.array(errorObjectSchema).check(z.minLength(1)),
    meta: z.optional(unknownMetaSchema),
});

/**
 * Represents an error thrown when a JSON:API request fails
 */
export class JsonApiError extends Error {
    public readonly status: number;
    public readonly errors: ErrorObject[];
    public readonly meta: UnknownMeta | undefined;

    public constructor(message: string, status: number, errors: ErrorObject[], meta?: UnknownMeta) {
        super(message);

        this.status = status;
        this.errors = errors;
        this.meta = meta;
    }
}

/**
 * Handle any non-successful response and throw a `JsonApiError`
 *
 * If the response was successful, this function does nothing.
 *
 * @throws {typeof import('zod/v4/core').$ZodError} if the response does not contain a valid JSON:API error document
 * @throws {JsonApiError} if the response is a JSON:API error response
 */
export const handleJsonApiError = async (response: Response): Promise<void> => {
    if (response.ok) {
        return;
    }

    const contentType = response.headers.get("Content-Type");

    if (!contentType?.startsWith("application/vnd.api+json")) {
        throw new Error(`Failed to parse error response, invalid content type: ${contentType}`);
    }

    const result = errorDocumentSchema.parse((await response.json()) as unknown);

    throw new JsonApiError(
        `Failed to perform request to ${response.url}`,
        response.status,
        result.errors,
        result.meta,
    );
};
