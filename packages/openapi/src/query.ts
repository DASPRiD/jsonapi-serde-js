import type { ParseQueryOptions, SparseFieldSets } from "@jsonapi-serde/server/request";
import type { ParameterObject, SchemaObject } from "openapi3-ts/oas31";
import type { $ZodType } from "zod/v4/core";
import { toJSONSchema } from "zod/v4/core";

/**
 * Generates OpenAPI 3.1 parameters based on query options
 */
export const buildQueryParameters = (
    options: ParseQueryOptions<
        readonly string[] | undefined,
        readonly string[] | undefined,
        SparseFieldSets | undefined,
        $ZodType | undefined,
        $ZodType | undefined
    >,
): ParameterObject[] => {
    const parameters: ParameterObject[] = [];

    if (options.include?.allowed) {
        parameters.push({
            name: "include",
            in: "query",
            schema: {
                type: "array",
                items: {
                    type: "string",
                    enum: [...new Set(options.include.allowed.flatMap(expandDotNotation))],
                },
                default: options.include.default,
            },
        });
    }

    if (options.sort?.allowed) {
        parameters.push({
            name: "include",
            in: "query",
            schema: {
                type: "array",
                items: {
                    type: "string",
                    enum: [
                        ...options.sort.allowed,
                        ...options.sort.allowed.map((field) => `-${field}`),
                    ],
                },
                maxItems: options.sort.multiple ? undefined : 1,
                default: options.sort.default?.map(
                    (field) => `${field.order === "desc" ? "-" : ""}${field.field}`,
                ),
            },
        });
    }

    if (options.fields?.allowed) {
        parameters.push({
            name: "fields",
            in: "query",
            style: "deepObject",
            schema: {
                type: "object",
                properties: Object.fromEntries(
                    Object.entries(options.fields.allowed).map(([type, fields]) => [
                        type,
                        {
                            type: "string",
                            description: `Comma-separated list of fields to include for this type. Leave empty to omit all fields. Allowed fields are: ${fields.map((field) => `\`${field}\``).join(", ")}`,
                        },
                    ]),
                ),
                default: options.fields.default,
                additionalProperties: false,
            },
        });
    }

    if (options.filter) {
        let required: true | undefined = true;

        if (options.filter._zod.optin === "optional") {
            required = undefined;
        }

        parameters.push({
            name: "filter",
            in: "query",
            style: "deepObject",
            schema: toJSONSchema(options.filter, {
                io: "input",
                target: "openapi-3.0",
            }) as SchemaObject,
            required,
        });
    }

    if (options.page) {
        let required: true | undefined = true;

        if (options.page._zod.optin === "optional") {
            required = undefined;
        }

        parameters.push({
            name: "page",
            in: "query",
            style: "deepObject",
            schema: toJSONSchema(options.page, {
                io: "input",
                target: "openapi-3.0",
            }) as SchemaObject,
            required,
        });
    }

    return parameters;
};

const expandDotNotation = (input: string): string[] => {
    const parts = input.split(".");
    const result: string[] = [];

    for (let i = 1; i <= parts.length; ++i) {
        result.push(parts.slice(0, i).join("."));
    }

    return result;
};
