import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { $ZodError } from "zod/v4/core";
import { z } from "zod/v4/mini";
import { createDeserializer } from "../../src/index.js";

const userAttributes = z.object({
    name: z.string(),
    age: z.number(),
});

const petAttributes = z.object({
    species: z.string(),
});

const metaSchema = z.object({
    createdAt: z.string(),
});

describe("deserializer/implementation", () => {
    describe("createDeserializer", () => {
        it("deserializes a single resource with attributes", () => {
            const deserialize = createDeserializer({
                type: "user",
                cardinality: "one",
                attributesSchema: userAttributes,
            });

            const input = {
                data: {
                    id: "u1",
                    type: "user",
                    attributes: {
                        name: "Alice",
                        age: 30,
                    },
                },
            };

            const document = deserialize(input);
            assert.equal(document.data.id, "u1");
            assert.equal(document.data.name, "Alice");
            assert.equal(document.data.age, 30);
        });

        it("supports one_nullable resource", () => {
            const deserialize = createDeserializer({
                type: "user",
                cardinality: "one_nullable",
            });

            const input = {
                data: null,
            };

            const document = deserialize(input);
            assert.equal(document.data, null);
        });

        it("supports many resources", () => {
            const deserialize = createDeserializer({
                type: "user",
                cardinality: "many",
            });

            const input = {
                data: [
                    { id: "a", type: "user" },
                    { id: "b", type: "user" },
                ],
            };

            const document = deserialize(input);
            assert.deepEqual(document.data, [{ id: "a" }, { id: "b" }]);
        });

        it("deserializes resource with one relationship and included data", () => {
            const deserialize = createDeserializer({
                type: "user",
                cardinality: "one",
                attributesSchema: userAttributes,
                relationships: {
                    pet: {
                        type: "pet",
                        cardinality: "one",
                        included: {
                            attributesSchema: petAttributes,
                            metaSchema,
                        },
                    },
                },
            });

            const input = {
                data: {
                    id: "u1",
                    type: "user",
                    attributes: {
                        name: "Alice",
                        age: 30,
                    },
                    relationships: {
                        pet: {
                            data: {
                                type: "pet",
                                id: "p1",
                            },
                        },
                    },
                },
                included: [
                    {
                        id: "p1",
                        type: "pet",
                        attributes: {
                            species: "dog",
                        },
                        meta: {
                            createdAt: "2020-01-01",
                        },
                    },
                ],
            };

            const document = deserialize(input);
            assert.equal(document.data.pet.id, "p1");
            assert.equal(document.data.pet.species, "dog");
            assert.equal(document.data.pet.$meta.createdAt, "2020-01-01");
        });

        it("throws if included resource is missing", () => {
            const deserialize = createDeserializer({
                type: "user",
                cardinality: "one",
                relationships: {
                    pet: {
                        type: "pet",
                        cardinality: "one",
                        included: {
                            attributesSchema: petAttributes,
                        },
                    },
                },
            });

            const input = {
                data: {
                    id: "u1",
                    type: "user",
                    relationships: {
                        pet: {
                            data: { id: "p1", type: "pet" },
                        },
                    },
                },
                included: [],
            };

            assert.throws(() => deserialize(input), {
                message: /referencing missing resource/,
            });
        });

        it("throws if included resource is invalid", () => {
            const deserialize = createDeserializer({
                type: "user",
                cardinality: "one",
                relationships: {
                    pet: {
                        type: "pet",
                        cardinality: "one",
                        included: {
                            attributesSchema: petAttributes,
                        },
                    },
                },
            });

            const input = {
                data: {
                    id: "u1",
                    type: "user",
                    relationships: {
                        pet: {
                            data: { id: "p1", type: "pet" },
                        },
                    },
                },
                included: [
                    {
                        id: "p1",
                        type: "pet",
                        attributes: {
                            // missing species
                        },
                    },
                ],
            };

            assert.throws(
                () => deserialize(input),
                (error) => {
                    assert(error instanceof $ZodError);
                    assert.deepEqual(error.issues, [
                        {
                            expected: "string",
                            code: "invalid_type",
                            path: ["included", 0, "attributes", "species"],
                            message: "Invalid input",
                        },
                    ]);
                    return true;
                },
            );
        });

        it("supports one_nullable relationship", () => {
            const deserialize = createDeserializer({
                type: "user",
                cardinality: "one",
                relationships: {
                    pet: {
                        type: "pet",
                        cardinality: "one_nullable",
                    },
                },
            });

            const input = {
                data: {
                    id: "u1",
                    type: "user",
                    relationships: {
                        pet: {
                            data: null,
                        },
                    },
                },
            };

            const document = deserialize(input);
            assert.equal(document.data.pet, null);
        });

        it("supports many relationships", () => {
            const deserialize = createDeserializer({
                type: "user",
                cardinality: "one",
                relationships: {
                    pets: {
                        type: "pet",
                        cardinality: "many",
                    },
                },
            });

            const input = {
                data: {
                    id: "u1",
                    type: "user",
                    relationships: {
                        pets: {
                            data: [
                                { id: "p1", type: "pet" },
                                { id: "p2", type: "pet" },
                            ],
                        },
                    },
                },
            };

            const document = deserialize(input);
            assert.deepEqual(document.data.pets, [{ id: "p1" }, { id: "p2" }]);
        });

        it("handles links and meta on the resource", () => {
            const deserialize = createDeserializer({
                type: "user",
                cardinality: "one",
                attributesSchema: userAttributes,
                linksSchema: z.object({ self: z.url() }),
                metaSchema,
                documentMetaSchema: metaSchema,
            });

            const input = {
                data: {
                    id: "u1",
                    type: "user",
                    attributes: {
                        name: "Alice",
                        age: 30,
                    },
                    links: {
                        self: "https://api.example.com/u1",
                    },
                    meta: {
                        createdAt: "2024-12-01",
                    },
                },
                meta: {
                    createdAt: "2025-01-01",
                },
            };

            const output = deserialize(input);
            assert.equal(output.data.$links.self, "https://api.example.com/u1");
            assert.equal(output.data.$meta.createdAt, "2024-12-01");
            assert.equal(output.meta.createdAt, "2025-01-01");
        });

        it("deserializes deeply nested included resources", () => {
            const deserialize = createDeserializer({
                type: "user",
                cardinality: "one",
                attributesSchema: z.object({
                    name: z.string(),
                }),
                relationships: {
                    pet: {
                        type: "pet",
                        cardinality: "one",
                        included: {
                            attributesSchema: z.object({
                                species: z.string(),
                            }),
                            relationships: {
                                vet: {
                                    type: "vet",
                                    cardinality: "one",
                                    included: {
                                        attributesSchema: z.object({
                                            name: z.string(),
                                        }),
                                    },
                                },
                            },
                        },
                    },
                },
            });

            const input = {
                data: {
                    id: "u1",
                    type: "user",
                    attributes: { name: "Alice" },
                    relationships: {
                        pet: {
                            data: { id: "p1", type: "pet" },
                        },
                    },
                },
                included: [
                    {
                        id: "p1",
                        type: "pet",
                        attributes: {
                            species: "dog",
                        },
                        relationships: {
                            vet: {
                                data: {
                                    id: "v1",
                                    type: "vet",
                                },
                            },
                        },
                    },
                    {
                        id: "v1",
                        type: "vet",
                        attributes: {
                            name: "Dr. Smith",
                        },
                    },
                ],
            };

            const document = deserialize(input);

            assert.equal(document.data.id, "u1");
            assert.equal(document.data.name, "Alice");

            const pet = document.data.pet;
            assert.equal(pet.id, "p1");
            assert.equal(pet.species, "dog");

            const vet = pet.vet;
            assert.equal(vet.id, "v1");
            assert.equal(vet.name, "Dr. Smith");
        });

        it("re-uses already parsed entities", () => {
            const deserialize = createDeserializer({
                type: "user",
                cardinality: "many",
                relationships: {
                    pet: {
                        type: "pet",
                        cardinality: "one",
                        included: {},
                    },
                },
            });

            const input = {
                data: [
                    {
                        id: "u1",
                        type: "user",
                        attributes: { name: "Alice" },
                        relationships: {
                            pet: {
                                data: { id: "p1", type: "pet" },
                            },
                        },
                    },
                    {
                        id: "u2",
                        type: "user",
                        attributes: { name: "Alice" },
                        relationships: {
                            pet: {
                                data: { id: "p1", type: "pet" },
                            },
                        },
                    },
                ],
                included: [
                    {
                        id: "p1",
                        type: "pet",
                    },
                ],
            };

            const document = deserialize(input);

            assert.equal(document.data[0].pet, document.data[1].pet);
        });
    });
});
