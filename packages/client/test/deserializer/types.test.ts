import { expectTypeOf } from "expect-type";
import type { $ZodType } from "zod/v4/core";
import type {
    DeserializedDocument,
    DeserializedResource,
    Links,
    ResourceIdentifier,
    TopLevelLinks,
} from "../../src/index.js";

type EmptyResource = DeserializedResource<undefined, undefined, undefined, undefined>;
expectTypeOf<EmptyResource>().toEqualTypeOf<{
    id: string;
}>();

type SimpleResource = DeserializedResource<
    $ZodType<{ name: string }>,
    undefined,
    $ZodType<Links>,
    $ZodType<{ version: string }>
>;
expectTypeOf<SimpleResource>().branded.toEqualTypeOf<{
    id: string;
    name: string;
    $links: Links;
    $meta: {
        version: string;
    };
}>();

type DeeplyNestedResource = DeserializedResource<
    $ZodType<{ name: "a" }>,
    {
        b: {
            cardinality: "one";
            type: "foo";
            included: {
                attributesSchema: $ZodType<{ name: "b" }>;
                relationships: {
                    c: {
                        cardinality: "one";
                        type: "foo";
                        included: {
                            attributesSchema: $ZodType<{ name: "c" }>;
                        };
                    };
                };
            };
        };
    },
    undefined,
    undefined
>;
expectTypeOf<DeeplyNestedResource>().branded.toEqualTypeOf<{
    id: string;
    name: "a";
    b: {
        id: string;
        name: "b";
        c: {
            id: string;
            name: "c";
        };
    };
}>();

type ResourceWithNullableRelationship = DeserializedResource<
    undefined,
    {
        b: {
            cardinality: "one_nullable";
            type: "foo";
        };
    },
    undefined,
    undefined
>;
expectTypeOf<ResourceWithNullableRelationship>().branded.toEqualTypeOf<{
    id: string;
    b: ResourceIdentifier | null;
}>();

type ResourceWithManyRelationship = DeserializedResource<
    undefined,
    {
        b: {
            cardinality: "many";
            type: "foo";
        };
    },
    undefined,
    undefined
>;
expectTypeOf<ResourceWithManyRelationship>().branded.toEqualTypeOf<{
    id: string;
    b: ResourceIdentifier[];
}>();

type SimpleDeserializedDocument = DeserializedDocument<
    "one",
    undefined,
    undefined,
    undefined,
    undefined,
    $ZodType<{ version: string }>
>;
expectTypeOf<SimpleDeserializedDocument>().branded.toEqualTypeOf<{
    data: {
        id: string;
    };
    meta: {
        version: string;
    };
    links?: TopLevelLinks;
}>();
