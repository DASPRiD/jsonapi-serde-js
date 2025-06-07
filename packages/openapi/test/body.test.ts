import assert from "node:assert/strict";
import { describe, it } from "node:test";
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
                                    type: { type: "string", enum: ["book"] },
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
                                    type: { type: "string", enum: ["book"] },
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
                                    type: { type: "string", enum: ["book"] },
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

        it('includes "relationships" when relationshipsSchema is provided', () => {
            const result = buildResourceRequestContentObject({
                type: "book",
                relationshipsSchema: z.object({
                    author: z.object({ data: z.any() }),
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
                                    type: { type: "string", enum: ["book"] },
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
            });

            assert.partialDeepStrictEqual(result, {
                "application/vnd.api+json": {
                    schema: {
                        type: "object",
                        required: ["data"],
                        properties: {
                            data: {
                                type: "object",
                                required: ["type", "id", "attributes", "relationships"],
                                properties: {
                                    type: { type: "string", enum: ["book"] },
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
                                                type: { type: "string", enum: ["comment"] },
                                                attributes: { type: "object" },
                                            },
                                        },
                                        {
                                            type: "object",
                                            properties: {
                                                lid: { type: "string" },
                                                type: { type: "string", enum: ["author"] },
                                                relationships: { type: "object" },
                                            },
                                        },
                                        {
                                            type: "object",
                                            properties: {
                                                lid: { type: "string" },
                                                type: { type: "string", enum: ["empty"] },
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
                                        type: { type: "string", enum: ["user"] },
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
