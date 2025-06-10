import type {
    AttributesSchema,
    IncludedTypeSchemas,
    ParseResourceRequestOptions,
    RelationshipsSchema,
} from "@jsonapi-serde/server/request";
import type { ContentObject, SchemaObject } from "openapi3-ts/oas31";
import { toJSONSchema } from "zod/v4/core";
import type { $ZodType } from "zod/v4/core";

/**
 * Generates an OpenAPI 3.1 content object for resource requests based on parser options
 */
export const buildResourceRequestContentObject = (
    options: ParseResourceRequestOptions<
        $ZodType<string> | undefined,
        string,
        AttributesSchema | undefined,
        RelationshipsSchema | undefined,
        IncludedTypeSchemas | undefined
    >,
): ContentObject => {
    const resourceProperties: Record<string, SchemaObject> = {
        type: { type: "string", enum: [options.type] },
    };
    const resourceRequired: string[] = ["type"];

    if (options.idSchema) {
        resourceProperties.id = toJSONSchema(options.idSchema, { io: "input" }) as SchemaObject;
        resourceRequired.push("id");
    }

    if (options.attributesSchema) {
        resourceProperties.attributes = toJSONSchema(options.attributesSchema, {
            io: "input",
        }) as SchemaObject;
        resourceRequired.push("attributes");
    }

    if (options.relationshipsSchema) {
        resourceProperties.relationships = toJSONSchema(options.relationshipsSchema, {
            io: "input",
        }) as SchemaObject;
        resourceRequired.push("relationships");
    }

    const resourceSchema: SchemaObject = {
        type: "object",
        properties: resourceProperties,
        required: resourceRequired,
        additionalProperties: false,
    };

    const rootProperties: Record<string, SchemaObject> = {
        data: resourceSchema,
    };

    if (options.includedTypeSchemas) {
        rootProperties.included = {
            type: "array",
            items: {
                oneOf: Object.entries(options.includedTypeSchemas).map(([type, options]) => {
                    const properties: Record<string, SchemaObject> = {
                        lid: { type: "string" },
                        type: { type: "string", enum: [type] },
                    };
                    const required: string[] = ["lid", "type"];

                    if (options.attributesSchema) {
                        properties.attributes = toJSONSchema(options.attributesSchema, {
                            io: "input",
                        }) as SchemaObject;
                        required.push("attributes");
                    }

                    if (options.relationshipsSchema) {
                        properties.relationships = toJSONSchema(options.relationshipsSchema, {
                            io: "input",
                        }) as SchemaObject;
                        required.push("relationships");
                    }

                    return {
                        type: "object",
                        properties: properties,
                        required: required,
                    };
                }),
            },
        };
    }

    const schema: SchemaObject = {
        type: "object",
        properties: rootProperties,
        required: ["data"],
        additionalProperties: false,
    };

    return {
        "application/vnd.api+json": { schema },
    };
};

/**
 * Generates an OpenAPI 3.1 content object for relationships requests based on parser options
 */
export const buildRelationshipsRequestContentObject = (
    type: string,
    idSchema?: $ZodType<string | null> | undefined,
): ContentObject => {
    const schema: SchemaObject = {
        type: "object",
        properties: {
            data: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        type: { type: "string", enum: [type] },
                        id: idSchema
                            ? (toJSONSchema(idSchema, { io: "input" }) as SchemaObject)
                            : { type: "string", example: "abc" },
                    },
                    required: ["id", "type"],
                    additionalProperties: false,
                },
            },
        },
        required: ["data"],
        additionalProperties: false,
    };

    return {
        "application/vnd.api+json": { schema },
    };
};
