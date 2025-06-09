import type { ResponseObject, SchemaObject } from "openapi3-ts/oas31";

export type Cardinality = "one" | "one_nullable" | "many";

export type RelationshipDefinition = {
    name: string;
    type: string;
    id?: SchemaObject;
    cardinality: Cardinality;
};

export type MetaSchemaObject = SchemaObject & { type: "object" };
export type LinkSchemaObjects = Record<string, SchemaObject>;

export type BuildResourceSchemaObjectOptions = {
    type: string;
    id?: SchemaObject;
    attributes?: SchemaObject;
    relationships?: RelationshipDefinition[];
    meta?: MetaSchemaObject;
    links?: LinkSchemaObjects;
    title?: string;
    description?: string;
};

export const linkStringSchemaObject: SchemaObject = { type: "string", format: "uri-reference" };
export const linkObjectSchemaObject: SchemaObject = {
    type: "object",
    properties: {
        href: { type: "string", format: "uri-reference" },
        rel: { type: "string" },
        describedby: { type: "string" },
        title: { type: "string" },
        type: { type: "string" },
        hreflang: { type: "string" },
        meta: {
            type: "object",
        },
    },
    required: ["href"],
};
export const linkSchemaObject: SchemaObject = {
    oneOf: [linkStringSchemaObject, linkObjectSchemaObject],
};

/**
 * Builds an OpenAPI 3.1 SchemaObject for a resource, including id, type, attributes, relationships, meta, and links
 */
export const buildResourceSchemaObject = (
    options: BuildResourceSchemaObjectOptions,
): SchemaObject => {
    const properties: Record<string, SchemaObject> = {
        id: options.id ?? {
            type: "string",
            example: "abc",
        },
        type: {
            type: "string",
            enum: [options.type],
        },
    };

    const required = ["id", "type"];

    if (options.attributes) {
        properties.attributes = options.attributes;
        required.push("attributes");
    }

    if (options.relationships) {
        properties.relationships = {
            type: "object",
            properties: Object.fromEntries(
                options.relationships.map((relationship) => {
                    const resourceIdentifierSchema: SchemaObject = {
                        type: "object",
                        properties: {
                            id: relationship.id ?? { type: "string", example: "abc" },
                            type: { type: "string", enum: [relationship.type] },
                        },
                        required: ["id", "type"],
                    };

                    const schemaObject = {
                        type: "object",
                        properties: {
                            data: expandSchema(resourceIdentifierSchema, relationship.cardinality),
                        },
                        required: ["data"],
                    } satisfies SchemaObject;

                    return [relationship.name, schemaObject];
                }),
            ),
            required: options.relationships.map((relationship) => relationship.name),
        };
        required.push("relationships");
    }

    if (options.links) {
        properties.links = buildLinksSchemaObject(options.links);
        required.push("links");
    }

    if (options.meta) {
        properties.meta = options.meta;
        required.push("meta");
    }

    return {
        type: "object",
        properties,
        required,
        title: options.title,
        description: options.description,
    };
};

type BuildDataResponseObjectOptions = {
    resourceSchema: SchemaObject;
    cardinality: Cardinality;
    meta?: MetaSchemaObject;
    description?: string;
    links?: LinkSchemaObjects;
    included?: SchemaObject[];
};

/**
 * Builds an OpenAPI 3.1 ResponseObject for data responses including data, meta, links, and included
 */
export const buildDataResponseObject = (
    options: BuildDataResponseObjectOptions,
): ResponseObject => {
    const properties: Record<string, SchemaObject> = {
        data: expandSchema(options.resourceSchema, options.cardinality),
    };
    const required = ["data"];

    if (options.meta) {
        properties.meta = options.meta;
        required.push("meta");
    }

    if (options.links) {
        properties.links = buildLinksSchemaObject(options.links);
    }

    if (options.included) {
        properties.included = {
            type: "array",
            items: {
                oneOf: options.included,
            },
        };
    }

    return {
        description: options.description ?? "OK",
        content: {
            "application/vnd.api+json": {
                schema: {
                    type: "object",
                    properties,
                    required,
                },
            },
        },
    };
};

export type BuildErrorResponseObjectOptions = {
    description: string;
};

/**
 * Builds an OpenAPI 3.1 ResponseObject for error responses containing an errors array
 */
export const buildErrorResponseObject = (
    options: BuildErrorResponseObjectOptions,
): ResponseObject => ({
    description: options.description,
    content: {
        "application/vnd.api+json": {
            schema: {
                type: "object",
                properties: {
                    errors: {
                        type: "array",
                        minLength: 1,
                        items: {
                            type: "object",
                            properties: {
                                status: { type: "string", description: "HTTP status code" },
                                code: { type: "string" },
                                title: { type: "string" },
                                detail: { type: "string" },
                                source: {
                                    type: "object",
                                    properties: {
                                        pointer: { type: "string" },
                                        parameter: { type: "string" },
                                        header: { type: "string" },
                                    },
                                },
                            },
                            required: ["status"],
                        },
                    },
                },
                required: ["errors"],
            },
        },
    },
});

const buildLinksSchemaObject = (links: LinkSchemaObjects): SchemaObject => ({
    type: "object",
    properties: Object.fromEntries(
        Object.entries(links).map(([name, schemaObject]) => [
            name,
            {
                oneOf: [schemaObject, { type: "null" }],
            },
        ]),
    ),
});

const expandSchema = (schema: SchemaObject, cardinality: Cardinality): SchemaObject => {
    switch (cardinality) {
        case "one":
            return schema;

        case "one_nullable":
            return {
                oneOf: [schema, { type: "null" }],
            };

        case "many":
            return {
                type: "array",
                items: schema,
            };
    }
};
