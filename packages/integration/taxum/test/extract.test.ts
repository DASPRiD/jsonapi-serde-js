import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createQueryParser } from "@jsonapi-serde/server/request";
import { Extensions, HttpRequest } from "@taxum/core/http";
import { PATH_PARAMS } from "@taxum/core/routing";
import { z } from "zod";
import {
    jsonApiQuery,
    jsonApiRelationship,
    jsonApiRelationships,
    jsonApiResource,
} from "../src/index.js";

describe("extract", () => {
    describe("jsonApiQuery", () => {
        it("should extract query parameters", async () => {
            const req = HttpRequest.builder()
                .uri(new URL("http://example.com/articles?fields[article]=title"))
                .body(null);

            const extractor = jsonApiQuery(
                createQueryParser({
                    fields: {
                        allowed: {
                            article: ["title"],
                        },
                    },
                }),
            );

            assert.deepEqual(await extractor(req), {
                fields: { article: ["title"] },
            });
        });
    });

    describe("jsonApiResource", () => {
        it("should extract body", async () => {
            const req = HttpRequest.builder()
                .header("content-type", "application/vnd.api+json")
                .body(
                    JSON.stringify({
                        data: { type: "article", attributes: { title: "foo" } },
                    }),
                );

            const extractor = jsonApiResource({
                type: "article",
                attributesSchema: z.object({
                    title: z.string(),
                }),
            });

            assert.deepEqual(await extractor(req), {
                type: "article",
                attributes: { title: "foo" },
            });
        });

        it("should validate ID from path param", async () => {
            const extensions = new Extensions();
            extensions.insert(PATH_PARAMS, { id: "1" });

            const req = HttpRequest.builder()
                .header("content-type", "application/vnd.api+json")
                .extensions(extensions)
                .body(
                    JSON.stringify({
                        data: { type: "article", id: "1", attributes: { title: "foo" } },
                    }),
                );

            const extractor = jsonApiResource(
                {
                    type: "article",
                    attributesSchema: z.object({
                        title: z.string(),
                    }),
                },
                "id",
            );

            assert.deepEqual(await extractor(req), {
                type: "article",
                id: "1",
                attributes: { title: "foo" },
            });
        });

        it("should validate ID with existing id schema", async () => {
            const extensions = new Extensions();
            extensions.insert(PATH_PARAMS, { id: "1" });

            const req = HttpRequest.builder()
                .header("content-type", "application/vnd.api+json")
                .extensions(extensions)
                .body(
                    JSON.stringify({
                        data: { type: "article", id: "1", attributes: { title: "foo" } },
                    }),
                );

            const extractor = jsonApiResource(
                {
                    type: "article",
                    idSchema: z.literal("1"),
                    attributesSchema: z.object({
                        title: z.string(),
                    }),
                },
                "id",
            );

            assert.deepEqual(await extractor(req), {
                type: "article",
                id: "1",
                attributes: { title: "foo" },
            });
        });
    });

    describe("jsonApiRelationship", () => {
        it("should extract relationship ID", async () => {
            const req = HttpRequest.builder()
                .header("content-type", "application/vnd.api+json")
                .body(
                    JSON.stringify({
                        data: { type: "article", id: "1" },
                    }),
                );

            const extractor = jsonApiRelationship("article");
            assert.equal(await extractor(req), "1");
        });
    });

    describe("jsonApiRelationships", () => {
        it("should extract relationship IDs", async () => {
            const req = HttpRequest.builder()
                .header("content-type", "application/vnd.api+json")
                .body(
                    JSON.stringify({
                        data: [
                            { type: "article", id: "1" },
                            { type: "article", id: "2" },
                        ],
                    }),
                );

            const extractor = jsonApiRelationships("article");
            assert.deepEqual(await extractor(req), ["1", "2"]);
        });
    });
});
