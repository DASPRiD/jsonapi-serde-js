import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { z } from "zod/v4";
import { buildQueryParameters } from "../src/index.js";

describe("query", () => {
    describe("buildQueryParameters", () => {
        it("includes `include` parameter with dot-expanded enum and default", () => {
            const result = buildQueryParameters({
                include: {
                    allowed: ["author.name", "comments.author"],
                    default: ["author.name"],
                },
            });

            assert.deepEqual(result[0], {
                name: "include",
                in: "query",
                schema: {
                    type: "array",
                    items: {
                        type: "string",
                        enum: ["author", "author.name", "comments", "comments.author"],
                    },
                    default: ["author.name"],
                },
            });
        });

        it("includes `sort` parameter with +/- enum, maxItems with `multiple` false", () => {
            const result = buildQueryParameters({
                sort: {
                    allowed: ["title", "createdAt"],
                    default: [{ field: "title", order: "asc" }],
                    multiple: false,
                },
            });

            assert.deepEqual(result[0], {
                name: "include",
                in: "query",
                schema: {
                    type: "array",
                    items: {
                        type: "string",
                        enum: ["title", "createdAt", "-title", "-createdAt"],
                    },
                    maxItems: 1,
                    default: ["title"],
                },
            });
        });

        it("includes `sort` parameter with +/- enum, with `multiple` true", () => {
            const result = buildQueryParameters({
                sort: {
                    allowed: ["title", "createdAt"],
                    default: [{ field: "title", order: "desc" }],
                    multiple: true,
                },
            });

            assert.deepEqual(result[0], {
                name: "include",
                in: "query",
                schema: {
                    type: "array",
                    items: {
                        type: "string",
                        enum: ["title", "createdAt", "-title", "-createdAt"],
                    },
                    maxItems: undefined,
                    default: ["-title"],
                },
            });
        });

        it("includes `fields` parameter with object properties and descriptions", () => {
            const result = buildQueryParameters({
                fields: {
                    allowed: {
                        articles: ["title", "body"],
                        people: ["name"],
                    },
                    default: {
                        articles: ["title"],
                    },
                },
            });

            assert.deepEqual(result[0], {
                name: "fields",
                in: "query",
                style: "deepObject",
                schema: {
                    type: "object",
                    properties: {
                        articles: {
                            type: "string",
                            description:
                                "Comma-separated list of fields to include for this type. Leave empty to omit all fields. Allowed fields are: `title`, `body`",
                        },
                        people: {
                            type: "string",
                            description:
                                "Comma-separated list of fields to include for this type. Leave empty to omit all fields. Allowed fields are: `name`",
                        },
                    },
                    default: {
                        articles: ["title"],
                    },
                    additionalProperties: false,
                },
            });
        });

        it("includes optional `filter` parameter when zod type is optional", () => {
            const result = buildQueryParameters({
                filter: z.object({ title: z.string() }).optional(),
            });

            assert.equal(result[0].name, "filter");
            assert.equal(result[0].required, undefined);
        });

        it("includes required `filter` parameter when zod type is not optional", () => {
            const result = buildQueryParameters({
                filter: z.object({ title: z.string() }),
            });

            assert.equal(result[0].name, "filter");
            assert.equal(result[0].required, true);
        });

        it("includes optional `page` parameter when zod type is optional", () => {
            const result = buildQueryParameters({
                page: z.object({ number: z.number() }).optional(),
            });

            assert.equal(result[0].name, "page");
            assert.equal(result[0].required, undefined);
        });

        it("includes required `page` parameter when zod type is not optional", () => {
            const result = buildQueryParameters({
                page: z.object({ number: z.number() }),
            });

            assert.equal(result[0].name, "page");
            assert.equal(result[0].required, true);
        });

        it("returns an empty array when no options are provided", () => {
            const result = buildQueryParameters({});
            assert.deepEqual(result, []);
        });
    });
});
