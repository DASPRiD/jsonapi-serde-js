import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SchemaObject } from "openapi3-ts/oas31";
import {
    buildDataResponseObject,
    buildErrorResponseObject,
    buildResourceSchemaObject,
    type LinkSchemaObjects,
    linkObjectSchemaObject,
    linkStringSchemaObject,
    type MetaSchemaObject,
} from "../src/index.js";

describe("response", () => {
    describe("buildResourceSchemaObject", () => {
        it("returns base schema with default idSchema and required 'id' and 'type'", () => {
            const result = buildResourceSchemaObject({ type: "book" });

            assert.deepEqual(result, {
                type: "object",
                properties: {
                    id: {
                        type: "string",
                        example: "abc",
                    },
                    type: {
                        type: "string",
                        enum: ["book"],
                    },
                },
                required: ["id", "type"],
                title: undefined,
                description: undefined,
            });
        });

        it("uses provided idSchema when given", () => {
            const result = buildResourceSchemaObject({
                type: "book",
                id: { type: "string", format: "uuid" },
            });

            assert.partialDeepStrictEqual(result, {
                properties: {
                    id: {
                        type: "string",
                        format: "uuid",
                    },
                },
            });
        });

        it("includes attributes and marks it as required", () => {
            const result = buildResourceSchemaObject({
                type: "book",
                attributes: {
                    type: "object",
                    properties: { title: { type: "string" } },
                    required: ["title"],
                },
            });

            assert.partialDeepStrictEqual(result, {
                properties: {
                    attributes: {
                        type: "object",
                        properties: { title: { type: "string" } },
                        required: ["title"],
                    },
                },
                required: ["attributes"],
            });
        });

        it("builds relationships with cardinality 'one'", () => {
            const result = buildResourceSchemaObject({
                type: "book",
                relationships: [{ name: "author", type: "person", cardinality: "one" }],
            });

            assert.partialDeepStrictEqual(result, {
                properties: {
                    relationships: {
                        type: "object",
                        properties: {
                            author: {
                                type: "object",
                                properties: {
                                    data: {
                                        type: "object",
                                        properties: {
                                            id: { type: "string" },
                                            type: { type: "string", enum: ["person"] },
                                        },
                                        required: ["id", "type"],
                                    },
                                },
                                required: ["data"],
                            },
                        },
                        required: ["author"],
                    },
                },
                required: ["relationships"],
            });
        });

        it("builds relationships with cardinality 'one_nullable'", () => {
            const result = buildResourceSchemaObject({
                type: "book",
                relationships: [{ name: "editor", type: "person", cardinality: "one_nullable" }],
            });

            assert.partialDeepStrictEqual(result, {
                properties: {
                    relationships: {
                        type: "object",
                        properties: {
                            editor: {
                                type: "object",
                                properties: {
                                    data: {
                                        oneOf: [
                                            {
                                                type: "object",
                                                properties: {
                                                    id: { type: "string" },
                                                    type: { type: "string", enum: ["person"] },
                                                },
                                                required: ["id", "type"],
                                            },
                                            { type: "null" },
                                        ],
                                    },
                                },
                                required: ["data"],
                            },
                        },
                        required: ["editor"],
                    },
                },
                required: ["relationships"],
            });
        });

        it("builds relationships with cardinality 'many'", () => {
            const result = buildResourceSchemaObject({
                type: "post",
                relationships: [{ name: "comments", type: "comment", cardinality: "many" }],
            });

            assert.partialDeepStrictEqual(result, {
                properties: {
                    relationships: {
                        type: "object",
                        properties: {
                            comments: {
                                type: "object",
                                properties: {
                                    data: {
                                        type: "array",
                                        items: {
                                            type: "object",
                                            properties: {
                                                id: { type: "string", example: "abc" },
                                                type: { type: "string", enum: ["comment"] },
                                            },
                                            required: ["id", "type"],
                                        },
                                    },
                                },
                                required: ["data"],
                            },
                        },
                        required: ["comments"],
                    },
                },
                required: ["relationships"],
            });
        });

        it("uses provided idSchema in relationship when given", () => {
            const result = buildResourceSchemaObject({
                type: "book",
                relationships: [
                    {
                        name: "author",
                        type: "person",
                        id: { type: "string", format: "uuid" },
                        cardinality: "one",
                    },
                ],
            });

            assert.partialDeepStrictEqual(result, {
                properties: {
                    relationships: {
                        properties: {
                            author: {
                                properties: {
                                    data: {
                                        properties: {
                                            id: {
                                                type: "string",
                                                format: "uuid",
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            });
        });

        it("includes links with oneOf original schema and null", () => {
            const links: LinkSchemaObjects = {
                self: linkStringSchemaObject,
                related: linkObjectSchemaObject,
            };

            const result = buildResourceSchemaObject({ type: "book", links });

            assert.partialDeepStrictEqual(result, {
                properties: {
                    links: {
                        type: "object",
                        properties: {
                            self: {
                                oneOf: [links.self, { type: "null" }],
                            },
                            related: {
                                oneOf: [links.related, { type: "null" }],
                            },
                        },
                    },
                },
                required: ["links"],
            });
        });

        it("includes meta and marks it required", () => {
            const meta: MetaSchemaObject = {
                type: "object",
                properties: {
                    lastUpdated: { type: "string", format: "date-time" },
                },
                required: ["lastUpdated"],
            };

            const result = buildResourceSchemaObject({
                type: "book",
                meta: meta,
            });

            assert.partialDeepStrictEqual(result, {
                properties: {
                    meta,
                },
                required: ["meta"],
            });
        });

        it("includes title and description in root schema", () => {
            const result = buildResourceSchemaObject({
                type: "book",
                title: "Book resource",
                description: "Schema for book resource",
            });

            assert.partialDeepStrictEqual(result, {
                title: "Book resource",
                description: "Schema for book resource",
            });
        });
    });

    describe("buildDataResponseObject", () => {
        it("returns schema with 'data' expanded based on cardinality, default description", () => {
            const resourceSchema: SchemaObject = { type: "string" };
            const cardinality = "one";

            const result = buildDataResponseObject({ resourceSchema, cardinality });

            assert.partialDeepStrictEqual(result, {
                description: "OK",
                content: {
                    "application/vnd.api+json": {
                        schema: {
                            required: ["data"],
                            properties: {
                                data: resourceSchema,
                            },
                        },
                    },
                },
            });
        });

        it("handles 'one_nullable' cardinality with oneOf null", () => {
            const resourceSchema: SchemaObject = { type: "string" };
            const cardinality = "one_nullable";

            const result = buildDataResponseObject({ resourceSchema, cardinality });

            assert.partialDeepStrictEqual(result, {
                content: {
                    "application/vnd.api+json": {
                        schema: {
                            properties: {
                                data: {
                                    oneOf: [resourceSchema, { type: "null" }],
                                },
                            },
                        },
                    },
                },
            });
        });

        it("handles 'many' cardinality wrapping in array", () => {
            const resourceSchema: SchemaObject = { type: "string" };
            const cardinality = "many";

            const result = buildDataResponseObject({ resourceSchema, cardinality });

            assert.partialDeepStrictEqual(result, {
                content: {
                    "application/vnd.api+json": {
                        schema: {
                            properties: {
                                data: {
                                    type: "array",
                                    items: resourceSchema,
                                },
                            },
                        },
                    },
                },
            });
        });

        it("includes meta schema and marks meta as required", () => {
            const resourceSchema: SchemaObject = { type: "string" };
            const cardinality = "one";
            const meta: MetaSchemaObject = {
                type: "object",
                properties: { foo: { type: "string" } },
            };

            const result = buildDataResponseObject({ resourceSchema, cardinality, meta });

            assert.partialDeepStrictEqual(result, {
                content: {
                    "application/vnd.api+json": {
                        schema: {
                            properties: { meta },
                            required: ["data", "meta"],
                        },
                    },
                },
            });
        });

        it("builds links schema correctly with nullable oneOf", () => {
            const resourceSchema: SchemaObject = { type: "string" };
            const cardinality = "one";
            const links: LinkSchemaObjects = {
                self: { type: "string", format: "uri" },
                related: { type: "string" },
            };

            const expectedLinksSchema = {
                type: "object",
                properties: {
                    self: { oneOf: [{ type: "string", format: "uri" }, { type: "null" }] },
                    related: { oneOf: [{ type: "string" }, { type: "null" }] },
                },
            };

            const result = buildDataResponseObject({ resourceSchema, cardinality, links });

            assert.partialDeepStrictEqual(result, {
                content: {
                    "application/vnd.api+json": {
                        schema: {
                            properties: {
                                links: expectedLinksSchema,
                            },
                        },
                    },
                },
            });
        });

        it("includes 'included' as array with oneOf schemas", () => {
            const resourceSchema: SchemaObject = { type: "string" };
            const cardinality = "one";
            const includedSchemas: SchemaObject[] = [
                { type: "object", properties: { foo: { type: "string" } } },
                { type: "object", properties: { bar: { type: "integer" } } },
            ];

            const result = buildDataResponseObject({
                resourceSchema,
                cardinality,
                included: includedSchemas,
            });

            assert.partialDeepStrictEqual(result, {
                content: {
                    "application/vnd.api+json": {
                        schema: {
                            properties: {
                                included: {
                                    type: "array",
                                    items: {
                                        oneOf: includedSchemas,
                                    },
                                },
                            },
                        },
                    },
                },
            });
        });

        it("uses the provided description if given", () => {
            const resourceSchema: SchemaObject = { type: "object" };
            const cardinality = "one";
            const description = "Custom description";

            const result = buildDataResponseObject({ resourceSchema, cardinality, description });

            assert.partialDeepStrictEqual(result, {
                description,
            });
        });
    });

    describe("buildErrorResponseObject", () => {
        it("returns a valid error response object with description and summary", () => {
            const options = {
                description: "Error occurred",
            };

            const result = buildErrorResponseObject(options);

            assert.partialDeepStrictEqual(result, {
                description: options.description,
                content: {
                    "application/vnd.api+json": {
                        schema: {
                            type: "object",
                            required: ["errors"],
                            properties: {
                                errors: {
                                    type: "array",
                                    minLength: 1,
                                    items: {
                                        type: "object",
                                        required: ["status"],
                                        properties: {
                                            status: {
                                                type: "string",
                                                description: "HTTP status code",
                                            },
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
                                    },
                                },
                            },
                        },
                    },
                },
            });
        });
    });
});
