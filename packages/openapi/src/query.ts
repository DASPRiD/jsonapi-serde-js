import type { ParseQueryOptions, SparseFieldSets } from "@jsonapi-serde/server/request";
import type { ParameterObject, SchemaObject } from "openapi3-ts/oas31";
import type { $ZodShape, $ZodType } from "zod/v4/core";
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
        $ZodType | undefined,
        $ZodShape | undefined
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
            name: "sort",
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
        parameters.push(buildSchemaParameter("filter", options.filter, "deepObject"));
    }

    if (options.page) {
        parameters.push(buildSchemaParameter("page", options.page, "deepObject"));
    }

    if (options.custom) {
        for (const [name, schema] of Object.entries(options.custom) as [string, $ZodType][]) {
            parameters.push(buildSchemaParameter(name, schema));
        }
    }

    return parameters;
};

const buildSchemaParameter = (
    name: string,
    schema: $ZodType,
    style?: ParameterObject["style"],
): ParameterObject => ({
    name,
    in: "query",
    ...(style ? { style } : {}),
    schema: toJSONSchema(schema, { io: "input", target: "openapi-3.0" }) as SchemaObject,
    required: schema._zod.optin === "optional" ? undefined : true,
});

const expandDotNotation = (input: string): string[] => {
    const parts = input.split(".");
    const result: string[] = [];

    for (let i = 1; i <= parts.length; ++i) {
        result.push(parts.slice(0, i).join("."));
    }

    return result;
};
