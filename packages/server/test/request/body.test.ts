import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { z } from "zod/v4";
import { JsonApiError, ZodValidationError } from "../../src/common/index.js";
import {
    clientResourceIdentifierSchema,
    parseRelationshipRequest,
    parseRelationshipsRequest,
    parseResourceRequest,
    relationshipSchema,
    resourceIdentifierSchema,
} from "../../src/request/body.js";

const contentType = "application/vnd.api+json";
const basicContext = (body: string | Record<string, unknown>) => ({ body, contentType });

describe("request/body", () => {
    describe("parseResourceRequest", () => {
        const idSchema = z.uuid();
        const attributesSchema = z.strictObject({ name: z.string() });
        const relationshipsSchema = z.strictObject({
            friend: relationshipSchema(resourceIdentifierSchema("user")),
        });
        const metaSchema = z.strictObject({ foo: z.string() });

        it("parses valid resource with attributes and relationships", () => {
            const body = {
                data: {
                    id: "550e8400-e29b-41d4-a716-446655440000",
                    type: "user",
                    attributes: { name: "Ada" },
                    relationships: {
                        friend: { data: { type: "user", id: "2" } },
                    },
                },
            };

            const result = parseResourceRequest(basicContext(body), {
                type: "user",
                idSchema,
                attributesSchema,
                relationshipsSchema,
            });

            assert.equal(result.id, body.data.id);
            assert.equal(result.type, "user");
            assert.deepEqual(result.attributes, { name: "Ada" });
            assert.deepEqual(result.relationships.friend.data.id, "2");
        });

        it("parses valid resource with meta", () => {
            const body = {
                data: {
                    type: "user",
                    meta: { foo: "bar" },
                },
            };

            const result = parseResourceRequest(basicContext(body), {
                type: "user",
                metaSchema,
            });

            assert.equal(result.meta.foo, "bar");
        });

        it("throws on type mismatch", () => {
            const context = basicContext({
                data: {
                    id: "550e8400-e29b-41d4-a716-446655440000",
                    type: "post",
                },
            });

            assert.throws(
                () =>
                    parseResourceRequest(context, {
                        type: "user",
                        idSchema,
                    }),
                (error) => {
                    assert(error instanceof ZodValidationError);
                    assert.equal(error.errors.length, 1);
                    assert.equal(error.errors[0].code, "type_mismatch");
                    return true;
                },
            );
        });

        it("parses included resources and builds lookup maps", () => {
            const context = basicContext({
                data: {
                    type: "articles",
                    attributes: { title: "Hello" },
                    relationships: {
                        user: {
                            data: {
                                lid: "u-1",
                                type: "user",
                            },
                        },
                        comments: {
                            data: [
                                {
                                    lid: "c-1",
                                    type: "comment",
                                },
                            ],
                        },
                    },
                },
                included: [
                    {
                        lid: "u-1",
                        type: "user",
                        attributes: { name: "Ada" },
                    },
                    {
                        lid: "c-1",
                        type: "comment",
                        attributes: { text: "Foo" },
                        relationships: {
                            user: {
                                data: {
                                    lid: "u-2",
                                    type: "user",
                                },
                            },
                        },
                    },
                    {
                        lid: "u-2",
                        type: "user",
                        attributes: { name: "Alice" },
                    },
                ],
            });

            const result = parseResourceRequest(context, {
                type: "articles",
                attributesSchema: z.strictObject({ title: z.string() }),
                relationshipsSchema: z.strictObject({
                    user: relationshipSchema(clientResourceIdentifierSchema("user")),
                    comments: relationshipSchema(
                        z.array(clientResourceIdentifierSchema("comment")),
                    ),
                }),
                includedTypeSchemas: {
                    user: {
                        attributesSchema: z.strictObject({ name: z.string() }),
                    },
                    comment: {
                        attributesSchema: z.strictObject({ text: z.string() }),
                        relationshipsSchema: z.strictObject({
                            user: relationshipSchema(clientResourceIdentifierSchema("user")),
                        }),
                    },
                },
            });

            assert.deepEqual(result.includedTypes.user.get("u-1").attributes.name, "Ada");
            assert.deepEqual(result.includedTypes.user.get("u-2").attributes.name, "Alice");
            assert.deepEqual(result.includedTypes.comment.get("c-1").attributes.text, "Foo");
        });

        it("throws if included resource lid missing", () => {
            const context = basicContext({
                data: {
                    type: "article",
                },
                included: [],
            });

            const result = parseResourceRequest(context, {
                type: "article",
                includedTypeSchemas: {
                    user: {},
                },
            });

            assert.throws(
                () => result.includedTypes.user.get("missing"),
                (error) => {
                    assert(error instanceof JsonApiError);
                    assert.equal(error.errors.length, 1);
                    assert.equal(error.errors[0].code, "missing_included_resource");
                    return true;
                },
            );
            assert.equal(result.includedTypes.user.safeGet("missing"), null);
        });

        it("handles no included schemas (skips included)", () => {
            const context = basicContext({
                data: {
                    type: "things",
                },
            });

            const result = parseResourceRequest(context, { type: "things" });
            assert.equal(result.type, "things");
            assert(!result.includedTypes);
        });

        it("handles empty included schemas (skips included)", () => {
            const context = basicContext({
                data: {
                    type: "things",
                },
            });

            const result = parseResourceRequest(context, {
                type: "things",
                includedTypeSchemas: {},
            });
            assert.equal(result.type, "things");
            assert(result.includedTypes);
        });

        it("throws on invalid JSON string", () => {
            const context = { body: "{", contentType };

            assert.throws(
                () => parseResourceRequest(context, { type: "fail" }),
                (error) => {
                    assert(error instanceof JsonApiError);
                    assert.equal(error.errors.length, 1);
                    assert.equal(error.errors[0].code, "invalid_json_body");
                    return true;
                },
            );
        });

        it("throws on undefined media type", () => {
            const context = { body: {}, contentType: undefined };

            assert.throws(
                () => parseResourceRequest(context, { type: "fail" }),
                (error) => {
                    assert(error instanceof JsonApiError);
                    assert.equal(error.errors.length, 1);
                    assert.equal(error.errors[0].code, "unsupported_media_type");
                    return true;
                },
            );
        });

        it("throws on empty media type", () => {
            const context = { body: {}, contentType: "application/json" };

            assert.throws(
                () => parseResourceRequest(context, { type: "fail" }),
                (error) => {
                    assert(error instanceof JsonApiError);
                    assert.equal(error.errors.length, 1);
                    assert.equal(error.errors[0].code, "unsupported_media_type");
                    return true;
                },
            );
        });

        it("throws on unsupported media type", () => {
            const context = { body: {}, contentType: "text/plain" };

            assert.throws(
                () => parseResourceRequest(context, { type: "fail" }),
                (error) => {
                    assert(error instanceof JsonApiError);
                    assert.equal(error.errors.length, 1);
                    assert.equal(error.errors[0].code, "unsupported_media_type");
                    return true;
                },
            );
        });

        it("throws on unsupported content-type parameters", () => {
            const context = {
                body: {},
                contentType: "application/vnd.api+json; charset=utf-8",
            };

            assert.throws(
                () => parseResourceRequest(context, { type: "fail" }),
                (error) => {
                    assert(error instanceof JsonApiError);
                    assert.equal(error.errors.length, 1);
                    assert.equal(error.errors[0].code, "unsupported_media_type");
                    return true;
                },
            );
        });
    });

    describe("parseRelationshipRequest", () => {
        it("parses identifiers", () => {
            const context = basicContext({
                data: { type: "tag", id: "1" },
            });

            const result = parseRelationshipRequest(context, "tag");
            assert.equal(result, "1");
        });

        it("allows nullable id schema", () => {
            const context = basicContext({
                data: { type: "tag", id: null },
            });

            const result = parseRelationshipRequest(context, "tag", z.string().nullable());
            assert.equal(result, null);
        });

        it("throws on empty media type", () => {
            const context = { body: "{}", contentType: "" };

            assert.throws(
                () => parseRelationshipRequest(context, "tag"),
                (error) => {
                    assert(error instanceof JsonApiError);
                    assert.equal(error.errors.length, 1);
                    assert.equal(error.errors[0].code, "unsupported_media_type");
                    return true;
                },
            );
        });

        it("throws on invalid media type", () => {
            const context = { body: "{}", contentType: ";" };

            assert.throws(
                () => parseRelationshipRequest(context, "tag"),
                (error) => {
                    assert(error instanceof JsonApiError);
                    assert.equal(error.errors.length, 1);
                    assert.equal(error.errors[0].code, "bad_request");
                    return true;
                },
            );
        });

        it("throws on wrong media type", () => {
            const context = { body: "{}", contentType: "application/json" };

            assert.throws(
                () => parseRelationshipRequest(context, "tag"),
                (error) => {
                    assert(error instanceof JsonApiError);
                    assert.equal(error.errors.length, 1);
                    assert.equal(error.errors[0].code, "unsupported_media_type");
                    return true;
                },
            );
        });

        it("throws on invalid body shape", () => {
            const context = basicContext({ bad: true });

            assert.throws(
                () => parseRelationshipRequest(context, "tag"),
                (error) => {
                    assert(error instanceof ZodValidationError);
                    return true;
                },
            );
        });
    });

    describe("parseRelationshipsRequest", () => {
        it("parses array of identifiers", () => {
            const context = basicContext({
                data: [
                    { type: "tag", id: "1" },
                    { type: "tag", id: "2" },
                ],
            });

            const result = parseRelationshipsRequest(context, "tag");
            assert.deepEqual(result, ["1", "2"]);
        });

        it("throws on empty media type", () => {
            const context = { body: "{}", contentType: "" };

            assert.throws(
                () => parseRelationshipsRequest(context, "tag"),
                (error) => {
                    assert(error instanceof JsonApiError);
                    assert.equal(error.errors.length, 1);
                    assert.equal(error.errors[0].code, "unsupported_media_type");
                    return true;
                },
            );
        });

        it("throws on wrong media type", () => {
            const context = { body: "{}", contentType: "application/json" };

            assert.throws(
                () => parseRelationshipsRequest(context, "tag"),
                (error) => {
                    assert(error instanceof JsonApiError);
                    assert.equal(error.errors.length, 1);
                    assert.equal(error.errors[0].code, "unsupported_media_type");
                    return true;
                },
            );
        });

        it("throws on invalid body shape", () => {
            const context = basicContext({ bad: true });

            assert.throws(
                () => parseRelationshipsRequest(context, "tags"),
                (error) => {
                    assert(error instanceof ZodValidationError);
                    return true;
                },
            );
        });
    });
});
