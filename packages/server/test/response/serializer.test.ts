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

// A required property, because an all-optional context survives the contravariant check that the
// serializer's declared context otherwise fails, so it would pass whether or not the type reaches
// the map intact.
type GreetingContext = {
    salutation: string;
};

const greetingSerializer: EntitySerializer<typeof user, GreetingContext> = {
    getId: (user) => user.id,
    serialize: (user, context) => ({
        attributes: { greeting: `${context?.salutation ?? "Hello"}, ${user.name}` },
    }),
};

const serializeGreeting = SerializeBuilder.new().add("user", greetingSerializer).build();

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

    describe("serializer context", () => {
        it("hands a serializer the context stored under its own type", () => {
            const result = serializeGreeting("user", user, {
                context: { user: { salutation: "Hi" } },
            });

            assert.deepEqual(result.getBody(), {
                jsonapi: {
                    version: "1.1",
                    ext: undefined,
                    profile: undefined,
                },
                data: {
                    type: "user",
                    id: "1",
                    attributes: { greeting: "Hi, Alice" },
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

const _typeTests = () => {
    serializeGreeting("user", user, {
        // @ts-expect-error Context does not match the serializer's own
        context: { user: { salutation: 123 } },
    });
};
