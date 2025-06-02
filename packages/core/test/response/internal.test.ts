import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EntitySerializer, SerializeMap, SerializedEntity } from "../../src/response/index.js";
import { serializeDocument } from "../../src/response/internal.js";

const user = { id: "1", name: "Alice" };
const post = { id: "2", title: "hello", author: user };
const comment = { id: "3", text: "nice post", post, author: user };

const userSerializer: EntitySerializer<typeof user> = {
    getId: (user) => user.id,
    serialize: (user) =>
        ({
            attributes: { name: user.name },
        }) satisfies SerializedEntity<typeof serializers>,
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
        }) satisfies SerializedEntity<typeof serializers>,
};

const commentSerializer: EntitySerializer<typeof comment> = {
    getId: (entity) => entity.id,
    serialize: (entity) =>
        ({
            attributes: { text: entity.text },
            relationships: {
                post: {
                    data: {
                        type: "post",
                        id: entity.post.id,
                        entity: entity.post,
                    },
                },
                author: {
                    data: {
                        type: "user",
                        id: entity.author.id,
                        entity: entity.author,
                    },
                },
            },
        }) satisfies SerializedEntity<typeof serializers>,
};

const serializers = {
    user: userSerializer,
    post: postSerializer,
    comment: commentSerializer,
} satisfies SerializeMap;

describe("request/internal", () => {
    describe("serializeDocument", () => {
        it("serializes a single entity with included relationships", () => {
            const result = serializeDocument(serializers, "post", post, { include: ["author"] });
            const body = result.getBody();

            assert.deepEqual(body.data, {
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
            });

            assert.deepEqual(body.included, [
                {
                    type: "user",
                    id: "1",
                    attributes: { name: "Alice" },
                    relationships: undefined,
                    links: undefined,
                    meta: undefined,
                },
            ]);
        });

        it("serializes iterable entities", () => {
            const result = serializeDocument(serializers, "post", [post, post], {
                include: ["author"],
            });
            const body = result.getBody();

            assert.ok(Array.isArray(body.data), "No data array");
            assert.ok(body.included, "No included array");

            assert.equal(body.data.length, 2);
            assert.equal(body.included.length, 1);
        });

        it("returns data: null when entity is null", () => {
            const result = serializeDocument(serializers, "user", null);
            const body = result.getBody();

            assert.equal(body.data, null);
            assert.equal(body.included, undefined);
        });

        it("filters fields in attributes and relationships", () => {
            const result = serializeDocument(serializers, "comment", comment, {
                fields: {
                    comment: ["text", "author"],
                    user: ["name"],
                },
            });
            const data = result.getBody().data;
            assert.ok(data && !Array.isArray(data), "No data resource");

            assert.equal(data.attributes?.text, "nice post");
            assert.equal(data.relationships?.post, undefined);
            assert.deepEqual(data.relationships?.author?.data, { type: "user", id: "1" });
        });

        it("filters fields with empty array (removes all fields)", () => {
            const result = serializeDocument(serializers, "comment", comment, {
                fields: {
                    comment: [],
                },
            });
            const data = result.getBody().data;
            assert.ok(data && !Array.isArray(data), "No data resource");

            assert.equal(data.attributes, undefined);
            assert.equal(data.relationships, undefined);
        });

        it("supports include paths to limit included entities", () => {
            const result = serializeDocument(serializers, "comment", comment, {
                include: ["author"],
            });
            const included = result.getBody().included;
            assert.ok(included, "No included array");

            assert.equal(included.length, 1);
            assert.equal(included[0].type, "user");
            assert.equal(included[0].id, "1");
        });

        it("does not include entities outside include paths", () => {
            const result = serializeDocument(serializers, "comment", comment, {
                include: ["post.author"],
            });
            const included = result.getBody().included;
            assert.ok(included, "No included array");

            assert.equal(included.length, 2);
            assert.equal(included[0].type, "user");
            assert.equal(included[0].id, "1");
            assert.equal(included[1].type, "post");
            assert.equal(included[1].id, "2");
        });

        it("deduplicates included entities with same type and id", () => {
            const result = serializeDocument(serializers, "comment", comment, {
                include: ["author", "post.author"],
            });
            const included = result.getBody().included;
            assert.ok(included, "No included array");

            assert.equal(included.length, 2);
            assert.equal(included[0].type, "user");
            assert.equal(included[0].id, "1");
            assert.equal(included[1].type, "post");
            assert.equal(included[1].id, "2");
        });

        it("handles circular relationships without infinite recursion", () => {
            const circularUser = { id: "u1", name: "Circular", comments: [] as (typeof comment)[] };
            const circularPost = {
                id: "p1",
                title: "Circular post",
                author: circularUser,
            } satisfies typeof post;
            const circularComment = {
                id: "c1",
                text: "Circular comment",
                post: circularPost,
                author: circularUser,
            } satisfies typeof comment;
            circularUser.comments.push(circularComment);

            const circularUserSerializer: EntitySerializer<typeof circularUser> = {
                getId: (entity) => entity.id,
                serialize: (entity) =>
                    ({
                        attributes: { name: entity.name },
                        relationships: {
                            comments: {
                                data: entity.comments.map((comment) => ({
                                    type: "comment",
                                    id: comment.id,
                                    entity: comment,
                                })),
                            },
                        },
                    }) satisfies SerializedEntity<typeof circularSerializers>,
            };

            const circularSerializers = {
                user: circularUserSerializer,
                post: postSerializer,
                comment: commentSerializer,
            } satisfies SerializeMap;

            const result = serializeDocument(circularSerializers, "comment", circularComment, {
                include: ["author.comments.author"],
            });

            const included = result.getBody().included;
            assert.ok(included, "No included array");

            assert.ok(
                included.some((resource) => resource.type === "user" && resource.id === "u1"),
                "User missing",
            );
            assert.ok(
                included.some((resource) => resource.type === "comment" && resource.id === "c1"),
                "Comment missing",
            );
        });

        it("filters fields in nested included entities correctly", () => {
            const result = serializeDocument(serializers, "comment", comment, {
                include: ["author", "post.author"],
                fields: {
                    user: ["name"],
                    post: ["title"],
                },
            });

            const included = result.getBody().included;
            assert.ok(included, "No included array");

            const includedUsers = included.filter((resource) => resource.type === "user");

            for (const resource of includedUsers) {
                assert.deepEqual(Object.keys(resource.attributes ?? {}), ["name"]);
            }

            const includedPost = included.find((resource) => resource.type === "post");
            assert.ok(includedPost, "No included post");
            assert.deepEqual(Object.keys(includedPost.attributes ?? {}), ["title"]);
        });

        it("handles entities with empty relationships", () => {
            const serializer: EntitySerializer<typeof entity> = {
                getId: (entity) => entity.id,
                serialize: () => ({
                    attributes: { foo: "bar" },
                    relationships: {},
                }),
            };

            const map = { foo: serializer } satisfies SerializeMap;
            const entity = { id: "x" };

            const result = serializeDocument(map, "foo", entity);
            const data = result.getBody().data;
            assert.ok(data && !Array.isArray(data), "No data resource");

            assert.equal(data.relationships, undefined);
        });

        it("handles entities with null relationship data", () => {
            const serializer: EntitySerializer<typeof entity> = {
                getId: (entity) => entity.id,
                serialize: (entity) => ({
                    id: entity.id,
                    attributes: {},
                    relationships: {
                        rel: {
                            data: null,
                        },
                    },
                }),
            };

            const map = { foo: serializer } satisfies SerializeMap;
            const entity = { id: "x" };

            const result = serializeDocument(map, "foo", entity);
            const data = result.getBody().data;
            assert.ok(data && !Array.isArray(data), "No data resource");

            assert.deepEqual(data.relationships?.rel, { data: null });
        });

        it("deduplicates included resources by type and id even if different objects", () => {
            const userA = { id: "1", name: "Ada" } satisfies typeof user;
            const userB = { id: "1", name: "Ada Clone" } satisfies typeof user;

            const postWithDifferentUserObjects = {
                id: "p",
                title: "Post",
                author: userA,
            } satisfies typeof post;

            const serializer: EntitySerializer<typeof post> = {
                getId: (entity) => entity.id,
                serialize: (entity) =>
                    ({
                        attributes: { title: entity.title },
                        relationships: {
                            author1: {
                                data: { type: "user", id: userA.id, entity: userA },
                            },
                            author2: {
                                data: { type: "user", id: userB.id, entity: userB },
                            },
                        },
                    }) satisfies SerializedEntity<typeof map>,
            };

            const map = { user: userSerializer, post: serializer } satisfies SerializeMap;

            const result = serializeDocument(map, "post", postWithDifferentUserObjects, {
                include: ["author1", "author2"],
            });
            const included = result.getBody().included;
            assert.ok(included, "No included array");

            const includedUsers = included.filter(
                (resource) => resource.type === "user" && resource.id === "1",
            );
            assert.equal(includedUsers.length, 1);
        });

        it("handles empty include array (no included resources)", () => {
            const result = serializeDocument(serializers, "post", post, {
                include: [],
            });

            assert.equal(result.getBody().included, undefined);
        });

        it("handles empty fields object (no filtering)", () => {
            const result = serializeDocument(serializers, "post", post, {
                fields: {},
            });
            const data = result.getBody().data;
            assert.ok(data && !Array.isArray(data), "No data resource");

            assert.ok(data.attributes?.title, "No title attribute");
        });

        it("handles empty objects for meta, links, extensions, profiles options", () => {
            const result = serializeDocument(serializers, "post", post, {
                meta: {},
                links: {},
                extensions: [],
                profiles: [],
            });

            const body = result.getBody();
            assert.ok(body.jsonapi, "No jsonapi member");

            assert.deepEqual(body.meta, {});
            assert.deepEqual(body.links, {});
            assert.deepEqual(body.jsonapi?.ext, []);
            assert.deepEqual(body.jsonapi?.profile, []);
        });

        it("should pass individual context down to entity serializer", () => {
            type Context = {
                foo?: string;
            };

            const serializer: EntitySerializer<Record<string, never>, Context> = {
                getId: () => "1",
                serialize: (_, context) =>
                    ({
                        attributes: { title: context?.foo },
                    }) satisfies SerializedEntity<typeof map>,
            };

            const map = { test: serializer } satisfies SerializeMap;

            const result = serializeDocument(
                map,
                "test",
                {},
                { context: { test: { foo: "bar" } } },
            );
            const data = result.getBody().data;
            assert.ok(data && !Array.isArray(data), "No data resource");

            assert.equal(data.attributes?.title, "bar");
        });
    });
});
