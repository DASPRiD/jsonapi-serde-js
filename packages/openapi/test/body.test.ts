import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { relationshipSchema, resourceIdentifierSchema } from "@jsonapi-serde/server/request";
import { z } from "zod/v4";
import {
    buildRelationshipsRequestContentObject,
    buildResourceRequestContentObject,
} from "../src/index.js";

describe("body", () => {
    describe("buildResourceRequestContentObject", () => {
        it('includes only required "type" when no other schemas are provided', () => {
            const result = buildResourceRequestContentObject({ type: "book" });

            assert.deepEqual(result, {
                "application/vnd.api+json": {
                    schema: {
                        type: "object",
                        required: ["data"],
                        properties: {
                            data: {
                                type: "object",
                                required: ["type"],
                                properties: {
                                    type: { type: "string", const: "book" },
                                },
                                additionalProperties: false,
                            },
                        },
                        additionalProperties: false,
                    },
                },
            });
        });

        it('includes "id" when idSchema is provided', () => {
            const result = buildResourceRequestContentObject({
                type: "book",
                idSchema: z.uuid(),
            });

            assert.partialDeepStrictEqual(result, {
                "application/vnd.api+json": {
                    schema: {
                        type: "object",
                        required: ["data"],
                        properties: {
                            data: {
                                type: "object",
                                required: ["type", "id"],
                                properties: {
                                    type: { type: "string", const: "book" },
                                    id: { type: "string", format: "uuid" },
                                },
                            },
                        },
                    },
                },
            });
        });

        it('includes "attributes" when attributesSchema is provided', () => {
            const result = buildResourceRequestContentObject({
                type: "book",
                attributesSchema: z.object({ title: z.string() }),
            });

            assert.partialDeepStrictEqual(result, {
                "application/vnd.api+json": {
                    schema: {
                        type: "object",
                        required: ["data"],
                        properties: {
                            data: {
                                type: "object",
                                required: ["type", "attributes"],
                                properties: {
                                    type: { type: "string", const: "book" },
                                    attributes: {
                                        type: "object",
                                        properties: {
                                            title: { type: "string" },
                                        },
                                        required: ["title"],
                                    },
                                },
                            },
                        },
                    },
                },
            });
        });

        it("describes a nullable attribute as a type union including null", () => {
            const result = buildResourceRequestContentObject({
                type: "book",
                attributesSchema: z.object({ subtitle: z.string().nullable() }),
            });

            assert.partialDeepStrictEqual(result, {
                "application/vnd.api+json": {
                    schema: {
                        properties: {
                            data: {
                                properties: {
                                    attributes: {
                                        properties: {
                                            subtitle: { type: ["string", "null"] },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            });
        });

        it('includes "relationships" when relationshipsSchema is provided', () => {
            const result = buildResourceRequestContentObject({
                type: "book",
                relationshipsSchema: z.object({
                    author: relationshipSchema(resourceIdentifierSchema("person")),
                }),
            });

            assert.partialDeepStrictEqual(result, {
                "application/vnd.api+json": {
                    schema: {
                        type: "object",
                        required: ["data"],
                        properties: {
                            data: {
                                type: "object",
                                required: ["type", "relationships"],
                                properties: {
                                    type: { type: "string", const: "book" },
                                    relationships: {
                                        type: "object",
                                        properties: {
                                            author: {
                                                type: "object",
                                                properties: {
                                                    data: {
                                                        type: "object",
                                                        properties: {
                                                            type: {
                                                                type: "string",
                                                                const: "person",
                                                            },
                                                        },
                                                        required: ["type", "id"],
                                                    },
                                                },
                                                required: ["data"],
                                            },
                                        },
                                        required: ["author"],
                                    },
                                },
                            },
                        },
                    },
                },
            });
        });

        it('includes "meta" when metaSchema is provided', () => {
            const result = buildResourceRequestContentObject({
                type: "book",
                metaSchema: z.object({ foo: z.string() }),
            });

            assert.partialDeepStrictEqual(result, {
                "application/vnd.api+json": {
                    schema: {
                        type: "object",
                        required: ["data"],
                        properties: {
                            data: {
                                type: "object",
                                required: ["type", "meta"],
                                properties: {
                                    type: { type: "string", const: "book" },
                                    meta: {
                                        type: "object",
                                        properties: {
                                            foo: { type: "string" },
                                        },
                                        required: ["foo"],
                                    },
                                },
                            },
                        },
                    },
                },
            });
        });

        it("includes all fields when all schemas are present", () => {
            const result = buildResourceRequestContentObject({
                type: "book",
                idSchema: z.string(),
                attributesSchema: z.object({ title: z.string() }),
                relationshipsSchema: z.object({
                    author: z.object({ data: z.any() }),
                }),
                metaSchema: z.object({ foo: z.string() }),
            });

            assert.partialDeepStrictEqual(result, {
                "application/vnd.api+json": {
                    schema: {
                        type: "object",
                        required: ["data"],
                        properties: {
                            data: {
                                type: "object",
                                required: ["type", "id", "attributes", "relationships", "meta"],
                                properties: {
                                    type: { type: "string", const: "book" },
                                    id: { type: "string" },
                                    attributes: {
                                        type: "object",
                                        properties: {
                                            title: { type: "string" },
                                        },
                                        required: ["title"],
                                    },
                                    relationships: {
                                        type: "object",
                                        properties: {
                                            author: {
                                                type: "object",
                                                properties: {
                                                    data: {},
                                                },
                                                required: ["data"],
                                            },
                                        },
                                        required: ["author"],
                                    },
                                    meta: {
                                        type: "object",
                                        properties: {
                                            foo: { type: "string" },
                                        },
                                        required: ["foo"],
                                    },
                                },
                            },
                        },
                    },
                },
            });
        });

        it('includes "included" with combinations of optional schemas', () => {
            const result = buildResourceRequestContentObject({
                type: "book",
                includedTypeSchemas: {
                    comment: {
                        attributesSchema: z.object({ body: z.string() }),
                    },
                    author: {
                        relationshipsSchema: z.object({
                            account: z.object({ data: z.any() }),
                        }),
                    },
                    empty: {},
                },
            });

            assert.partialDeepStrictEqual(result, {
                "application/vnd.api+json": {
                    schema: {
                        properties: {
                            included: {
                                type: "array",
                                items: {
                                    oneOf: [
                                        {
                                            type: "object",
                                            properties: {
                                                lid: { type: "string" },
                                                type: { type: "string", const: "comment" },
                                                attributes: { type: "object" },
                                            },
                                        },
                                        {
                                            type: "object",
                                            properties: {
                                                lid: { type: "string" },
                                                type: { type: "string", const: "author" },
                                                relationships: { type: "object" },
                                            },
                                        },
                                        {
                                            type: "object",
                                            properties: {
                                                lid: { type: "string" },
                                                type: { type: "string", const: "empty" },
                                            },
                                        },
                                    ],
                                },
                            },
                        },
                    },
                },
            });
        });
    });

    describe("buildRelationshipsRequestContentObject", () => {
        it("generates schema with default id property when idSchema is not provided", () => {
            const result = buildRelationshipsRequestContentObject("user");

            assert.deepEqual(result, {
                "application/vnd.api+json": {
                    schema: {
                        type: "object",
                        properties: {
                            data: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        type: { const: "user" },
                                        id: { type: "string", example: "abc" },
                                    },
                                    required: ["id", "type"],
                                    additionalProperties: false,
                                },
                            },
                        },
                        required: ["data"],
                        additionalProperties: false,
                    },
                },
            });
        });

        it("generates schema using idSchema if provided", () => {
            const idSchema = z.uuid();
            const result = buildRelationshipsRequestContentObject("comment", idSchema);

            assert.partialDeepStrictEqual(result, {
                "application/vnd.api+json": {
                    schema: {
                        properties: {
                            data: {
                                items: {
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
            });
        });
    });
});
