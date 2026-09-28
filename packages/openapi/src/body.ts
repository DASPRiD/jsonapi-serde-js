import type { AnyParseResourceRequestOptions } from "@jsonapi-serde/server/request";
import type { ContentObject, SchemaObject } from "openapi3-ts/oas31";
import { z } from "zod/v4";
import type { $ZodType } from "zod/v4/core";
import { toSchemaObject } from "./json-schema.js";

/**
 * Generates an OpenAPI 3.1 content object for resource requests based on parser options
 */
export const buildResourceRequestContentObject = (
    options: AnyParseResourceRequestOptions,
): ContentObject => {
    const resourceShape: z.core.$ZodLooseShape = {
        type: z.literal(options.type),
    };

    if (options.idSchema) {
        resourceShape.id = options.idSchema;
    }

    if (options.attributesSchema) {
        resourceShape.attributes = options.attributesSchema;
    }

    if (options.relationshipsSchema) {
        resourceShape.relationships = options.relationshipsSchema;
    }

    if (options.metaSchema) {
        resourceShape.meta = options.metaSchema;
    }

    const resourceSchema = toSchemaObject(z.strictObject(resourceShape));

    const rootProperties: Record<string, SchemaObject> = {
        data: resourceSchema,
    };

    if (options.includedTypeSchemas) {
        rootProperties.included = {
            type: "array",
            items: {
                oneOf: Object.entries(options.includedTypeSchemas).map(([type, options]) => {
                    const shape: z.core.$ZodLooseShape = {
                        type: z.literal(type),
                        lid: z.string(),
                    };

                    if (options.attributesSchema) {
                        shape.attributes = options.attributesSchema;
                    }

                    if (options.relationshipsSchema) {
                        shape.relationships = options.relationshipsSchema;
                    }

                    return toSchemaObject(z.strictObject(shape));
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
                        type: { const: type },
                        id: idSchema
                            ? toSchemaObject(idSchema)
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
