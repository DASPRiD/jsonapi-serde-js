import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
    type EntitySerializer,
    type InferSerializedEntity,
    SerializeBuilder,
} from "../../src/response/index.js";

const user = { id: "1", name: "Alice" };
const post = { id: "2", title: "hello", author: user };

const userSerializer: EntitySerializer<typeof user> = {
    getId: (user) => user.id,
    serialize: (user) => ({
        attributes: { name: user.name },
    }),
};

const postSerializer: EntitySerializer<typeof post> = {
    getId: (entity) => entity.id,
    serialize: (entity) =>
        ({
            attributes: { title: entity.title },
            relationships: {
                author: {
                    data: {
                        type: "user",
                        id: entity.author.id,
                        entity: entity.author,
                    },
                },
            },
        }) satisfies InferSerializedEntity<typeof serialize>,
};

const serialize = SerializeBuilder.new()
    .add("user", userSerializer)
    .add("post", postSerializer)
    .build();

describe("request/serializer", () => {
    describe("SerializeBuilder", () => {
        it("serializes a single entity", () => {
            const result = serialize("post", post, { include: ["author"] });

            assert.equal(result.getStatus(), 200);
            assert.deepEqual(result.getBody(), {
                jsonapi: {
                    version: "1.1",
                    ext: undefined,
                    profile: undefined,
                },
                data: {
                    type: "post",
                    id: "2",
                    attributes: { title: "hello" },
                    relationships: {
                        author: {
                            data: { type: "user", id: "1" },
                        },
                    },
                    links: undefined,
                    meta: undefined,
                },
                links: undefined,
                meta: undefined,
                included: [
                    {
                        type: "user",
                        id: "1",
                        attributes: { name: "Alice" },
                        relationships: undefined,
                        links: undefined,
                        meta: undefined,
                    },
                ],
            });
        });

        it("serializes an iterable of entities", () => {
            const result = serialize("post", [post], { include: ["author"] });

            assert.equal(result.getStatus(), 200);
            assert.deepEqual(result.getBody(), {
                jsonapi: {
                    version: "1.1",
                    ext: undefined,
                    profile: undefined,
                },
                data: [
                    {
                        type: "post",
                        id: "2",
                        attributes: { title: "hello" },
                        relationships: {
                            author: {
                                data: { type: "user", id: "1" },
                            },
                        },
                        links: undefined,
                        meta: undefined,
                    },
                ],
                links: undefined,
                meta: undefined,
                included: [
                    {
                        type: "user",
                        id: "1",
                        attributes: { name: "Alice" },
                        relationships: undefined,
                        links: undefined,
                        meta: undefined,
                    },
                ],
            });
        });

        it("serializes null", () => {
            const result = serialize("post", null, { include: ["author"] });

            assert.equal(result.getStatus(), 200);
            assert.deepEqual(result.getBody(), {
                jsonapi: {
                    version: "1.1",
                    ext: undefined,
                    profile: undefined,
                },
                data: null,
                links: undefined,
                meta: undefined,
                included: [],
            });
        });

        it("includes only specified fields", () => {
            const result = serialize("post", post, {
                fields: { post: ["title"] },
            });

            assert.equal(result.getStatus(), 200);
            assert.deepEqual(result.getBody(), {
                jsonapi: {
                    version: "1.1",
                    ext: undefined,
                    profile: undefined,
                },
                data: {
                    type: "post",
                    id: "2",
                    attributes: { title: "hello" },
                    relationships: undefined,
                    links: undefined,
                    meta: undefined,
                },
                links: undefined,
                meta: undefined,
                included: undefined,
            });
        });
    });
});
