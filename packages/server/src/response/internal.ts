import assert from "node:assert/strict";
import type { Relationships, Resource, ResourceIdentifier } from "../common/json-api.js";
import { JsonApiDocument } from "../common/response.js";
import type {
    IncludableResourceIdentifier,
    InferEntity,
    SerializedEntity,
    SerializeMap,
    SerializeOptions,
    SerializerContext,
} from "./serializer.js";

/**
 * Serializes one or more entities into a JSON:API-compliant document
 */
export const serializeDocument = <
    TMap extends SerializeMap,
    TType extends keyof TMap & string,
    TEntity extends InferEntity<TMap[TType]>,
>(
    map: TMap,
    type: TType,
    entity: TEntity | Iterable<TEntity> | null,
    options?: SerializeOptions<TMap>,
) => {
    let data: Resource | Resource[] | null;
    const includeCollection = new IncludeCollection(map, options);

    if (entity === null) {
        data = null;
    } else if (Symbol.iterator in entity) {
        data = [];

        for (const singleEntity of entity) {
            data.push(
                serializeEntityToResource(
                    map,
                    type,
                    singleEntity,
                    includeCollection,
                    "",
                    options?.fields,
                    options?.context,
                ),
            );
        }
    } else {
        data = serializeEntityToResource(
            map,
            type,
            entity,
            includeCollection,
            "",
            options?.fields,
            options?.context,
        );
    }

    return new JsonApiDocument(
        {
            data,
            included: includeCollection.toJson(),
            links: options?.links,
            meta: options?.meta,
        },
        options?.status,
        { extensions: options?.extensions, profiles: options?.profiles },
    );
};

/**
 * Extracts a relationship's resource identifier, adding the full entity to the included collection if needed
 */
const extractIncluded = <TMap extends SerializeMap>(
    identifier: IncludableResourceIdentifier<TMap>,
    includedCollection: IncludeCollection<TMap>,
    fieldPath: string,
): ResourceIdentifier => {
    const { entity, ...rest } = identifier;

    if (entity) {
        includedCollection.add(identifier.type, entity, fieldPath);
    }

    return rest;
};

/**
 * Builds a JSON:API-compliant relationships object for a serialized entity
 */
const buildRelationships = <TMap extends SerializeMap>(
    serializedEntity: SerializedEntity<TMap>,
    includeCollection: IncludeCollection<TMap>,
    parentPath: string,
): Relationships | undefined => {
    if (!serializedEntity.relationships) {
        return undefined;
    }

    const relationships: Relationships = {};

    for (const [key, relationship] of Object.entries(serializedEntity.relationships)) {
        /* node:coverage disable */
        if (!relationship) {
            continue;
        }
        /* node:coverage enable */

        const { data, ...rest } = relationship;

        if (!data) {
            relationships[key] = { ...rest, data };
            continue;
        }

        const path = parentPath === "" ? key : `${parentPath}.${key}`;

        if (Array.isArray(data)) {
            relationships[key] = {
                ...rest,
                data: data.map((data) => extractIncluded(data, includeCollection, path)),
            };
            continue;
        }

        relationships[key] = {
            ...rest,
            data: extractIncluded(data, includeCollection, path),
        };
    }

    return relationships;
};

/**
 * Filters object fields based on an allowlist of field names
 */
const filterFields = <T extends Record<string, unknown>>(
    values: T | undefined,
    includedFields?: string[],
): Partial<T> | undefined => {
    if (!values) {
        return undefined;
    }

    if (!includedFields) {
        return Object.keys(values).length === 0 ? undefined : values;
    }

    const entries = Object.entries(values).filter(([key]) => includedFields.includes(key));

    if (entries.length === 0) {
        return undefined;
    }

    return Object.fromEntries(entries) as Partial<T>;
};

/**
 * Converts a single entity into a JSON:API resource object
 */
const serializeEntityToResource = <
    TMap extends SerializeMap,
    TType extends keyof TMap & string,
    TEntity extends InferEntity<TMap[TType]>,
>(
    map: TMap,
    type: TType,
    entity: TEntity,
    includeCollection: IncludeCollection<TMap>,
    parentPath: string,
    fields: Partial<Record<string, string[]>> | undefined,
    context: Partial<SerializerContext<TMap>> | undefined,
): Resource => {
    const serializedEntity = map[type].serialize(entity, context?.[type]);
    const includedFields = fields?.[type];

    return {
        id: map[type].getId(entity),
        type,
        attributes: filterFields(serializedEntity.attributes, includedFields),
        relationships: filterFields(
            buildRelationships(serializedEntity, includeCollection, parentPath),
            includedFields,
        ),
        meta: serializedEntity.meta,
        links: serializedEntity.links,
    };
};

/**
 * Tracks which related entities should be included in the top-level `included` array
 */
class IncludeCollection<TMap extends SerializeMap> {
    private readonly map: TMap;
    private readonly options: SerializeOptions<TMap> | undefined;
    private readonly resources: Resource[] = [];
    private readonly alreadyIncluded = new Set<string>();

    /**
     * Creates a new include collection based on inclusion rules
     */
    public constructor(map: TMap, options: SerializeOptions<TMap> | undefined) {
        this.map = map;
        this.options = options;
    }

    /**
     * Adds an entity to the included set if it's not already present and matches an include path
     */
    public add<TType extends keyof TMap & string, TEntity extends InferEntity<TMap[TType]>>(
        type: TType,
        entity: TEntity,
        fieldPath: string,
    ): void {
        if (!this.shouldInclude(fieldPath)) {
            return;
        }

        assert(this.map[type], `Type '${type}' is not registered in serializer`);
        const key = `${type}\0${this.map[type].getId(entity)}`;

        if (this.alreadyIncluded.has(key)) {
            return;
        }

        this.alreadyIncluded.add(key);
        this.resources.push(
            serializeEntityToResource(
                this.map,
                type,
                entity,
                this,
                fieldPath,
                this.options?.fields,
                this.options?.context,
            ),
        );
    }

    /**
     * Converts the included resource set to JSON:API format
     */
    public toJson(): Resource[] | undefined {
        if (!this.options?.include || this.options.include.length === 0) {
            return undefined;
        }

        return this.resources;
    }

    /**
     * Checks if a given path should be included in the document
     */
    private shouldInclude(fieldPath: string): boolean {
        if (!this.options?.include) {
            return false;
        }

        for (const includePath of this.options.include) {
            if (includePath === fieldPath || includePath.startsWith(`${fieldPath}.`)) {
                return true;
            }
        }

        return false;
    }
}
