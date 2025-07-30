import { $ZodError, type $ZodType } from "zod/v4/core";
import { z } from "zod/v4/mini";
import type { LinksSchema } from "../common-schema-types.js";
import { topLevelLinksSchema } from "../common-schemas.js";
import type {
    AnyRelationship,
    AttributesSchema,
    Cardinality,
    CreateDeserializerOptions,
    DeserializedDocument,
    DeserializedRelationship,
    DeserializedRelationshipData,
    DeserializedResource,
    Deserializer,
    MetaSchema,
    Relationships,
    SomeIncluded,
    SomeRelationship,
} from "./types.js";

/**
 * Creates a deserializer function for a JSON:API document
 *
 * Supports varying cardinalities, attributes, relationships, links, and meta schemas.
 */
export const createDeserializer = <
    TCardinality extends Cardinality,
    TAttributesSchema extends AttributesSchema | undefined,
    TRelationships extends Relationships | undefined,
    TLinksSchema extends LinksSchema | undefined,
    TMetaSchema extends MetaSchema | undefined,
    TDocumentMetaSchema extends MetaSchema | undefined,
>(
    options: CreateDeserializerOptions<
        TCardinality,
        TAttributesSchema,
        TRelationships,
        TLinksSchema,
        TMetaSchema,
        TDocumentMetaSchema
    >,
): Deserializer<
    TCardinality,
    TAttributesSchema,
    TRelationships,
    TLinksSchema,
    TMetaSchema,
    TDocumentMetaSchema
> => {
    const resourceSchema = createResourceSchema(options.type, options);

    const documentSchema = z.object({
        data:
            options.cardinality === "one"
                ? resourceSchema
                : options.cardinality === "one_nullable"
                  ? z.nullable(resourceSchema)
                  : z.array(resourceSchema),
        included: includedSchema,
        links: z.optional(topLevelLinksSchema),
        ...(options.documentMetaSchema ? { meta: options.documentMetaSchema } : {}),
    });

    const resourceSchemeCache: ResourceSchemaCache = new Map();

    return (input: unknown) => {
        const result = documentSchema.parse(input);
        const includedMap = createIncludedMap(result.included);

        const document = {} as Record<string, unknown>;
        document.data = flattenData(result.data, includedMap, resourceSchemeCache);
        document.links = result.links;

        if ("meta" in result) {
            document.meta = result.meta;
        }

        return document as DeserializedDocument<
            TCardinality,
            TAttributesSchema,
            TRelationships,
            TLinksSchema,
            TMetaSchema,
            TDocumentMetaSchema
        >;
    };
};

type ResourceSchemaCache = Map<string, ResourceSchema>;

/**
 * Optional schema for the `included` section of a JSON:API document
 *
 * Ensures each included resource has at least `id` and `type`.
 */
const includedSchema = z.optional(
    z.array(
        z.looseObject({
            id: z.string(),
            type: z.string(),
        }),
    ),
);
type Included = z.output<typeof includedSchema>;

type CreateResourceSchemaOptions = {
    attributesSchema?: AttributesSchema;
    relationships?: Relationships;
    linksSchema?: LinksSchema;
    metaSchema?: MetaSchema;
};

/**
 * Dynamically creates a Zod schema for a resource object
 */
const createResourceSchema = (type: string, options: CreateResourceSchemaOptions) =>
    z.object({
        id: z.string(),
        type: z.literal(type),
        ...(options.attributesSchema ? { attributes: options.attributesSchema } : {}),
        ...(options.relationships
            ? { relationships: createRelationshipsSchema(options.relationships) }
            : {}),
        ...(options.linksSchema ? { links: options.linksSchema } : {}),
        ...(options.metaSchema ? { meta: options.metaSchema } : {}),
    });
type ResourceSchema = ReturnType<typeof createResourceSchema>;
type ParsedResource = z.output<ResourceSchema>;

/**
 * Constructs a schema for a set of relationships
 */
const createRelationshipsSchema = (relationships: Relationships) =>
    z.object(
        Object.fromEntries(
            Object.entries(relationships).map(([key, relationship]) => [
                key,
                createRelationshipSchema(relationship),
            ]),
        ),
    );
type ParsedRelationships = z.output<ReturnType<typeof createRelationshipsSchema>>;

type Identifier = {
    id: string;
    type: string;
};

/**
 * Creates a schema for an individual relationship field, handling various cardinalities
 */
const createRelationshipSchema = (relationship: SomeRelationship) => {
    let dataSchema: $ZodType;

    const identifierSchema = z.object({
        id: z.string(),
        type: z.literal(relationship.type),
    });

    switch (relationship.cardinality) {
        case "one": {
            dataSchema = identifierSchema;
            break;
        }

        case "one_nullable": {
            dataSchema = z.nullable(identifierSchema);
            break;
        }

        case "many": {
            dataSchema = z.array(identifierSchema);
            break;
        }
    }

    return z.pipe(
        z.object({
            data: dataSchema,
        }),
        z.transform((value) => ({
            ...value,
            $included: relationship.included,
        })),
    );
};
type ParsedRelationship = {
    data: Identifier | Identifier[] | null;
    $included: SomeIncluded | undefined;
};

type IncludedResource = {
    index: number;
    raw: unknown;
    processed: { [k: string]: AnyDeserializedResource };
};
type IncludedMap = Map<string, IncludedResource>;

/**
 * Builds a map from included resources, keyed by `${type}\0${id}`
 */
const createIncludedMap = (included: Included): IncludedMap =>
    new Map(
        included?.map((resource, index) => [
            `${resource.type}\0${resource.id}`,
            { index, raw: resource, processed: {} },
        ]) ?? [],
    );

/**
 * Flattens top-level `data` into deserialized resources
 */
const flattenData = (
    data: ParsedResource | ParsedResource[] | null,
    includedMap: IncludedMap,
    resourceSchemaCache: ResourceSchemaCache,
) => {
    if (data === null) {
        return null;
    }

    if (Array.isArray(data)) {
        return data.map((resource) =>
            flattenResource(resource, includedMap, resourceSchemaCache, []),
        );
    }

    return flattenResource(data, includedMap, resourceSchemaCache, []);
};

type AnyDeserializedResource = DeserializedResource<
    AttributesSchema | undefined,
    Relationships | undefined,
    LinksSchema | undefined,
    MetaSchema | undefined
>;

/**
 * Flattens an individual resource into its deserialized form
 */
const flattenResource = (
    resource: ParsedResource,
    includedMap: IncludedMap,
    resourceSchemaCache: ResourceSchemaCache,
    path: string[],
): AnyDeserializedResource => {
    return {
        id: resource.id,
        ...(resource.attributes ?? {}),
        ...(resource.relationships
            ? flattenRelationships(
                  resource.relationships as ParsedRelationships,
                  includedMap,
                  resourceSchemaCache,
                  path,
              )
            : {}),
        ...(resource.meta ? { $meta: resource.meta } : {}),
        ...(resource.links ? { $links: resource.links } : {}),
    };
};

/**
 * Flattens a set of relationships from a parsed resource
 */
const flattenRelationships = (
    relationships: ParsedRelationships,
    includedMap: IncludedMap,
    resourceSchemaCache: ResourceSchemaCache,
    parentPath: string[],
) =>
    Object.fromEntries(
        Object.entries(relationships).map(([key, relationship]) => [
            key,
            flattenRelationship(
                key,
                relationship as ParsedRelationship,
                includedMap,
                resourceSchemaCache,
                parentPath,
            ),
        ]),
    );

/**
 * Flattens a single relationship field into a deserialized relationship
 */
const flattenRelationship = (
    field: string,
    relationship: ParsedRelationship,
    includedMap: IncludedMap,
    resourceSchemaCache: ResourceSchemaCache,
    parentPath: string[],
): DeserializedRelationship<AnyRelationship> => {
    if (relationship.data === null) {
        return null;
    }

    if (Array.isArray(relationship.data)) {
        return relationship.data.map((identifier) =>
            flattenRelationshipData(
                field,
                identifier,
                relationship.$included,
                includedMap,
                resourceSchemaCache,
                parentPath,
            ),
        );
    }

    return flattenRelationshipData(
        field,
        relationship.data,
        relationship.$included,
        includedMap,
        resourceSchemaCache,
        parentPath,
    );
};

/**
 * Resolves and validates a referenced relationship resource from the included map
 *
 * @throws {Error} if the referenced included resource is missing
 * @throws {$ZodError} if the included resource fails schema validation
 */
const flattenRelationshipData = (
    field: string,
    identifier: Identifier,
    included: SomeIncluded | undefined,
    includedMap: IncludedMap,
    resourceSchemaCache: ResourceSchemaCache,
    parentPath: string[],
): DeserializedRelationshipData<AnyRelationship> => {
    if (!included) {
        return { id: identifier.id };
    }

    const item = includedMap.get(`${identifier.type}\0${identifier.id}`);

    if (!item) {
        throw new Error(
            `Relationship ${field} of resource in path '${parentPath.join(".")}' is referencing missing resource of type ${identifier.type} with ID ${identifier.id}`,
        );
    }

    const fieldPath = [...parentPath, field];
    const cacheKey = fieldPath.join(".");

    if (item.processed[cacheKey]) {
        return item.processed[cacheKey];
    }

    let schema = resourceSchemaCache.get(cacheKey);

    if (!schema) {
        schema = createResourceSchema(identifier.type, included);
        resourceSchemaCache.set(cacheKey, schema);
    }

    const parseResult = schema.safeParse(item.raw);

    if (parseResult.success) {
        item.processed[cacheKey] = flattenResource(
            parseResult.data,
            includedMap,
            resourceSchemaCache,
            fieldPath,
        );
        return item.processed[cacheKey];
    }

    const rootPath: PropertyKey[] = ["included", item.index];

    throw new $ZodError(
        parseResult.error.issues.map((issue) => ({
            ...issue,
            path: [...rootPath, ...issue.path],
        })),
    );
};
