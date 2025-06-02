/**
 * @file Type definitions for deserializers
 *
 * These types are fine-tuned for a very low number of type instantiations. Any changes need to be benchmarked to avoid
 * instantiation explosions. To run a benchmark, execute:
 *
 * ```sh
 * pnpm bench-deserializer-types
 * ```
 */

import type { $ZodType } from "zod/v4/core";
import type { z } from "zod/v4/mini";
import type { LinksSchema, TopLevelLinks } from "../common-schema-types.js";

/**
 * Used instead of `Record<string, never>` to avoid inference issues in intersections
 */
// biome-ignore lint/complexity/noBannedTypes: Only used for intersections
type EmptyObject = {};

/**
 * Used instead of `Record<string, unknown>` to reduce type instantiations
 */
type UnknownRecord = { [k: string]: unknown };

/**
 * Schema representing resource attributes
 */
export type AttributesSchema = $ZodType<UnknownRecord>;

/**
 * Schema for metadata at either the resource or document level
 */
export type MetaSchema = $ZodType<UnknownRecord>;

/**
 * Cardinality of the primary data or a relationship
 */
export type Cardinality = "one" | "one_nullable" | "many";

/**
 * Expands the shape of `data` based on its cardinality
 */
type ExpandData<TCardinality extends Cardinality, TResource> = TCardinality extends "one"
    ? TResource
    : TCardinality extends "one_nullable"
      ? TResource | null
      : TResource[];

/**
 * Definition of what can be included (side-loaded) for a relationship
 */
export type Included<
    TAttributesSchema extends AttributesSchema | undefined,
    TRelationships extends Relationships | undefined,
    TMetaSchema extends MetaSchema | undefined,
    TLinksSchema extends LinksSchema | undefined,
> = {
    attributesSchema?: TAttributesSchema;
    relationships?: TRelationships;
    linksSchema?: TLinksSchema;
    metaSchema?: TMetaSchema;
};

/**
 * Arbitrary included relationship
 */
// biome-ignore lint/suspicious/noExplicitAny: Required for inference
export type AnyIncluded = Included<any, any, any, any>;
export type SomeIncluded = Included<
    AttributesSchema | undefined,
    Relationships | undefined,
    MetaSchema | undefined,
    LinksSchema | undefined
>;

/**
 * A relationship to another resource (either one or many)
 */
export type Relationship<TCardinality extends Cardinality, TIncluded extends AnyIncluded> = {
    type: string;
    cardinality: TCardinality;
    included?: TIncluded;
};

/**
 * Arbitrary relationship type.
 */
// biome-ignore lint/suspicious/noExplicitAny: Required for inference
export type AnyRelationship = Relationship<any, AnyIncluded>;
export type SomeRelationship = Relationship<Cardinality, SomeIncluded>;

/**
 * Collection of named relationships for a resource
 */
export type Relationships = {
    [k: string]: SomeRelationship;
};

/**
 * Minimal identifier for a resource reference
 */
export type ResourceIdentifier = { id: string };

/**
 * Final deserialized form of a relationship's data
 *
 * If `included` was provided, this is a full resource object; otherwise, only an `id` is available.
 */
export type DeserializedRelationshipData<TRelationship extends AnyRelationship> =
    TRelationship["included"] extends AnyIncluded
        ? DeserializedResource<
              TRelationship["included"]["attributesSchema"],
              TRelationship["included"]["relationships"],
              TRelationship["included"]["linksSchema"],
              TRelationship["included"]["metaSchema"]
          >
        : ResourceIdentifier;

/**
 * A deserialized relationship, adjusted for its cardinality
 */
export type DeserializedRelationship<TRelationship extends AnyRelationship> =
    TRelationship["cardinality"] extends "one"
        ? DeserializedRelationshipData<TRelationship>
        : TRelationship["cardinality"] extends "one_nullable"
          ? DeserializedRelationshipData<TRelationship> | null
          : DeserializedRelationshipData<TRelationship>[];

/**
 * Flattened optional attributes of a resource
 */
type ResourceAttributesOutput<T> = T extends $ZodType ? z.output<T> : EmptyObject;

/**
 * Flattened optional relationships of a resource
 */
type ResourceRelationshipsOutput<T> = T extends Relationships
    ? {
          [K in keyof T]: DeserializedRelationship<T[K]>;
      }
    : EmptyObject;

/**
 * Flattened optional links of a resource
 */
type ResourceLinksOutput<T> = T extends $ZodType ? { $links: z.output<T> } : EmptyObject;

/**
 * Flattened optional meta of a resource
 */
type ResourceMetaOutput<T> = T extends $ZodType ? { $meta: z.output<T> } : EmptyObject;

/**
 * Fully deserialized resource object
 *
 * Merges the resource ID with its flattened attributes, relationships, meta and links.
 */
export type DeserializedResource<
    TAttributesSchema extends AttributesSchema | undefined,
    TRelationships extends Relationships | undefined,
    TLinksSchema extends LinksSchema | undefined,
    TMetaSchema extends MetaSchema | undefined,
> = ResourceIdentifier &
    ResourceAttributesOutput<TAttributesSchema> &
    ResourceRelationshipsOutput<TRelationships> &
    ResourceLinksOutput<TLinksSchema> &
    ResourceMetaOutput<TMetaSchema>;

/**
 * Flattened optional meta of a document
 */
type DocumentMetaOutput<T> = T extends $ZodType ? { meta: z.output<T> } : EmptyObject;

/**
 * Top-level deserialized JSON:API document
 *
 * Includes the primary resource(s), optional top-level links, and optional document-level meta.
 */
export type DeserializedDocument<
    TCardinality extends Cardinality,
    TAttributesSchema extends AttributesSchema | undefined,
    TRelationships extends Relationships | undefined,
    TLinksSchema extends LinksSchema | undefined,
    TMetaSchema extends MetaSchema | undefined,
    TDocumentMetaSchema extends MetaSchema | undefined,
> = {
    data: ExpandData<
        TCardinality,
        DeserializedResource<TAttributesSchema, TRelationships, TLinksSchema, TMetaSchema>
    >;
    links?: TopLevelLinks;
} & DocumentMetaOutput<TDocumentMetaSchema>;

/**
 * A function that deserializes a JSON:API document into typed resource objects
 *
 * @throws {typeof import('zod/v4/core').$ZodError} if any validation fails
 * @throws {Error} if expected included resource is missing
 */
export type Deserializer<
    TCardinality extends Cardinality,
    TAttributesSchema extends AttributesSchema | undefined,
    TRelationships extends Relationships | undefined,
    TLinksSchema extends LinksSchema | undefined,
    TMetaSchema extends MetaSchema | undefined,
    TDocumentMetaSchema extends MetaSchema | undefined,
> = (
    input: unknown,
) => DeserializedDocument<
    TCardinality,
    TAttributesSchema,
    TRelationships,
    TLinksSchema,
    TMetaSchema,
    TDocumentMetaSchema
>;

/**
 * Options required to create a deserializer for a specific resource type
 */
export type CreateDeserializerOptions<
    TCardinality extends Cardinality,
    TAttributesSchema extends AttributesSchema | undefined,
    TRelationships extends Relationships | undefined,
    TLinksSchema extends LinksSchema | undefined,
    TMetaSchema extends MetaSchema | undefined,
    TDocumentMetaSchema extends MetaSchema | undefined,
> = {
    /**
     * Expected resource type
     */
    type: string;

    /**
     * Cardinality of the primary data
     */
    cardinality: TCardinality;

    /**
     * Optional schema to parse attributes
     */
    attributesSchema?: TAttributesSchema;

    /**
     * Optional definition of relationships
     */
    relationships?: TRelationships;

    /**
     * Optional schema to parse resource links
     */
    linksSchema?: TLinksSchema;

    /**
     * Optional schema ot parse resource meta
     */
    metaSchema?: TMetaSchema;

    /**
     * Optional schema to parse document meta
     */
    documentMetaSchema?: TDocumentMetaSchema;
};
