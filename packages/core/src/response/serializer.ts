import type {
    Attributes,
    Links,
    Meta,
    Relationship,
    ResourceIdentifier,
    TopLevelLinks,
} from "../common/json-api.js";
import type { JsonApiDocument } from "../common/response.js";
import type { Flatten } from "../common/utils.js";
import { serializeDocument } from "./internal.js";

/**
 * A resource identifier with an optional `entity` field
 *
 * Used to enable inclusion of full resource data in `included`.
 */
export type IncludableResourceIdentifier<
    TMap extends SerializeMap,
    TType extends keyof TMap & string = keyof TMap & string,
> = Omit<ResourceIdentifier, "type"> & {
    type: TType;
    entity?: InferEntity<TMap[TType]> | undefined;
};

/**
 * A relationship object that supports including full entities
 */
export type IncludableRelationship<TMap extends SerializeMap> = Omit<Relationship, "data"> & {
    data: IncludableResourceIdentifier<TMap> | IncludableResourceIdentifier<TMap>[] | null;
};

/**
 * The structure returned by an `EntitySerializer`
 *
 * This mimics a partial JSON:API resource object.
 */
export type SerializedEntity<TMap extends SerializeMap> = {
    attributes?: Partial<Attributes>;
    relationships?: Partial<Record<string, IncludableRelationship<TMap>>>;
    meta?: Meta;
    links?: Links;
};

/**
 * Context passed to individual entity serializers
 */
export type EntitySerializerContext = Record<string, unknown>;

/**
 * A serializer that converts a specific entity type into a partial resource object
 */
export type EntitySerializer<
    T extends object,
    TContext extends EntitySerializerContext = EntitySerializerContext,
    TMap extends SerializeMap = SerializeMap,
> = {
    getId: (entity: T) => string;
    serialize: (entity: T, context?: TContext) => SerializedEntity<TMap>;
};

/**
 * Infers the entity type from an EntitySerializer
 */
export type InferEntity<T extends EntitySerializer<object>> = T extends EntitySerializer<infer U>
    ? U
    : never;

/**
 * Infers the context type from an EntitySerializer
 */
export type InferContext<T extends EntitySerializer<object>> = T extends EntitySerializer<
    // biome-ignore lint/suspicious/noExplicitAny: Required for inference
    any,
    infer U
>
    ? U
    : never;

/**
 * A generic serializer type used for mapping any entity
 *
 * biome-ignore lint/suspicious/noExplicitAny: Required for inference
 */
export type AnyEntitySerializer = EntitySerializer<any>;

/**
 * A map from resource type to their associated serializer
 */
export type SerializeMap = {
    [key: string]: AnyEntitySerializer;
};

/**
 * Options for customizing serialization output
 */
export type SerializeOptions<TMap extends SerializeMap> = {
    /**
     * Context for serializers
     */
    context?: Partial<SerializerContext<TMap>>;

    /**
     * HTTP status code to include in the response
     */
    status?: number;

    /**
     * Relationship paths to include in `included`
     */
    include?: string[];

    /**
     * Fields to include for each resource type
     */
    fields?: Partial<Record<keyof TMap & string, string[]>>;

    /**
     * Top-level `links` object
     */
    links?: TopLevelLinks;

    /**
     * Top-level `meta` object
     */
    meta?: Meta;

    /**
     * JSON:API extension URIs
     */
    extensions?: string[];

    /**
     * JSON:API profile URIs
     */
    profiles?: string[];
};

/**
 * Context passed down to entity serializers
 */
export type SerializerContext<TMap extends SerializeMap> = {
    [K in keyof TMap]: InferContext<TMap[K]>;
};

/**
 * A function that serializes one or more entities into a JSON:API document
 */
export type Serializer<TMap extends SerializeMap> = <TType extends keyof TMap & string>(
    type: TType,
    entity: InferEntity<TMap[TType]> | Iterable<InferEntity<TMap[TType]>> | null,
    options?: SerializeOptions<TMap>,
) => JsonApiDocument;

/**
 * Infers the serialize map from a serializer
 */
export type InferSerializeMap<T extends Serializer<SerializeMap>> = T extends Serializer<infer U>
    ? U
    : never;

/**
 * Infers the serialize entity from a serializer
 */
export type InferSerializedEntity<T extends Serializer<SerializeMap>> = SerializedEntity<
    InferSerializeMap<T>
>;

/**
 * Empty map used as initial state for the builder
 */
type EmptyMap = { [key: string]: never };

/**
 * Utility type to merge two `SerializeMap` types
 *
 * If the base is empty, returns the new map; otherwise merges both.
 */
type MergeMap<TBase extends SerializeMap, TNew extends SerializeMap> = TBase extends EmptyMap
    ? TNew
    : Flatten<TBase & TNew>;

/**
 * Fluent builder for constructing a typed `Serializer` instance
 *
 * You start with `SerializeBuilder.new()`, then chain `.add(...)` for each entity type you want to support, and finally
 * call `.build()` to get the serializer.
 */
export class SerializeBuilder<T extends SerializeMap> {
    private readonly serializers: T;

    private constructor(serializers: T) {
        this.serializers = serializers;
    }

    /**
     * Creates a new `SerializeBuilder` with no registered serializers
     */
    public static new(): SerializeBuilder<EmptyMap> {
        return new SerializeBuilder({});
    }

    /**
     * Adds a serializer for a given resource `type`
     */
    public add<
        TType extends string,
        TEntity extends object,
        TResult = SerializeBuilder<MergeMap<T, { [K in TType]: EntitySerializer<TEntity> }>>,
    >(type: TType, serializer: EntitySerializer<TEntity>): TResult {
        return new SerializeBuilder({
            ...this.serializers,
            [type]: serializer,
        }) as TResult;
    }

    /**
     * Finalizes the builder and returns a fully-typed JSON:API serializer
     *
     * The returned function can serialize a single entity or an iterable of entities using the registered serializers.
     */
    public build(): Serializer<T> {
        return <TType extends keyof T & string>(
            type: TType,
            entity: InferEntity<T[TType]> | Iterable<InferEntity<T[TType]>> | null,
            options?: Partial<SerializeOptions<T>>,
        ) => {
            return serializeDocument(this.serializers, type, entity, options);
        };
    }
}
