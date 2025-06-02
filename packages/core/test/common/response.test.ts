import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { JsonApiError } from "../../src/common/error.js";
import { JsonApiDocument } from "../../src/common/response.js";

describe("common/response", () => {
    describe("JsonApiDocument", () => {
        const baseMembers = { data: { type: "example", id: "1" } };

        it("should return the default status", () => {
            const document = new JsonApiDocument(baseMembers);
            assert.equal(document.getStatus(), 200);
        });

        it("should return the provided status", () => {
            const document = new JsonApiDocument(baseMembers, 201);
            assert.equal(document.getStatus(), 201);
        });

        it("should return a valid body without mediaTypeOptions", () => {
            const document = new JsonApiDocument(baseMembers);
            assert.deepEqual(document.getBody(), {
                jsonapi: { version: "1.1", ext: undefined, profile: undefined },
                data: { type: "example", id: "1" },
            });
        });

        it("should return a valid body with mediaTypeOptions", () => {
            const document = new JsonApiDocument(baseMembers, 200, {
                extensions: ["ext1"],
                profiles: ["profile1", "profile2"],
            });

            assert.deepEqual(document.getBody(), {
                jsonapi: {
                    version: "1.1",
                    ext: ["ext1"],
                    profile: ["profile1", "profile2"],
                },
                data: { type: "example", id: "1" },
            });
        });

        describe("getContentType", () => {
            it("should return content type without parameters", () => {
                const document = new JsonApiDocument(baseMembers);
                assert.equal(document.getContentType(), "application/vnd.api+json");
            });

            it("should return content type with ext only", () => {
                const document = new JsonApiDocument(baseMembers, 200, {
                    extensions: ["foo", "bar"],
                });
                assert.equal(document.getContentType(), 'application/vnd.api+json;ext="foo bar"');
            });

            it("should return content type with profile only", () => {
                const document = new JsonApiDocument(baseMembers, 200, {
                    profiles: ["baz"],
                });
                assert.equal(document.getContentType(), 'application/vnd.api+json;profile="baz"');
            });

            it("should return content type with ext and profile", () => {
                const document = new JsonApiDocument(baseMembers, 200, {
                    extensions: ["a"],
                    profiles: ["x", "y"],
                });
                assert.equal(
                    document.getContentType(),
                    'application/vnd.api+json;ext="a";profile="x y"',
                );
            });
        });

        describe("verifyAcceptMediaType", () => {
            it("should pass when acceptableTypes includes required extensions", () => {
                const document = new JsonApiDocument(baseMembers, 200, {
                    extensions: ["ext1"],
                });

                assert.doesNotThrow(() => {
                    document.verifyAcceptMediaType([{ ext: ["ext1"], profile: [] }]);
                });
            });

            it("should fail if no acceptable types match the required extensions", () => {
                const document = new JsonApiDocument(baseMembers, 200, {
                    extensions: ["ext2"],
                });

                assert.throws(
                    () => {
                        document.verifyAcceptMediaType([{ ext: ["ext1"], profile: [] }]);
                    },
                    (err: unknown) =>
                        err instanceof JsonApiError &&
                        err.status === 406 &&
                        err.errors[0].code === "not_acceptable",
                );
            });

            it("should fail gracefully without mediaTypeOptions", () => {
                const document = new JsonApiDocument(baseMembers);

                assert.throws(
                    () => {
                        document.verifyAcceptMediaType([{ ext: ["x"], profile: [] }]);
                    },
                    (err: unknown) =>
                        err instanceof JsonApiError &&
                        err.status === 406 &&
                        err.errors[0].meta === undefined,
                );
            });
        });
    });
});
