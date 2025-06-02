import fastContentTypeParse from "fast-content-type-parse";
import { z } from "zod/v4";
import { JsonApiError, ZodValidationError, ZodValidationErrorParams } from "../common/index.js";

/**
 * Represents the structure of the request body and its content type
 */
export type BodyContext = {
    /** The request body, either as a raw JSON string or already-parsed object */
    body: Record<string, unknown> | string;

    /** The request's Content-Type header value */
    contentType: string | undefined;
};

/**
 * Creates a Zod schema that ensures a string equals the provided fixed type
 */
const fixedTypeSchema = <TType extends string>(type: TType) =>
    z.string().check((context) => {
        if (context.value !== type) {
            context.issues.push({
                code: "custom",
                message: "Type mismatch",
                params: new ZodValidationErrorParams(
                    "type_mismatch",
                    `Type '${context.value}' does not match '${type}'`,
                    409,
                ),
                input: context.value,
            });
        }
    }) as unknown as z.ZodType<TType>;

/**
 * Zod schema for a resource identifier with a required `type` and `id`
 */
export type ResourceIdentifierSchema<TType extends string> = z.ZodType<{
    type: TType;
    id: string;
}>;

/**
 * Constructs a Zod schema for a JSON:API resource identifier
 */
export const resourceIdentifierSchema = <TType extends string>(
    type: TType,
    idSchema: z.ZodType<string> = z.string(),
): ResourceIdentifierSchema<TType> =>
    z.strictObject({
        type: fixedTypeSchema(type),
        id: idSchema,
    });

/**
 * Zod schema for a client-generated resource identifier with a local ID (`lid`)
 */
export type ClientResourceIdentifierSchema<TType extends string> = z.ZodType<{
    type: TType;
    lid: string;
}>;

/**
 * Constructs a Zod schema for a client resource identifier using `lid`
 */
export const clientResourceIdentifierSchema = <TType extends string>(
    type: TType,
): ClientResourceIdentifierSchema<TType> =>
    z.strictObject({
        type: fixedTypeSchema(type),
        lid: z.string(),
    });

type AnyResourceIdentifier =
    | z.output<ResourceIdentifierSchema<string>>
    | z.output<ClientResourceIdentifierSchema<string>>;

/**
 * Union type representing one or more resource identifiers or `null`
 */
export type RelationshipDataSchema = z.ZodType<
    AnyResourceIdentifier | AnyResourceIdentifier[] | null
>;

/**
 * Schema for a JSON:API relationship object with a `data` field
 */
export type RelationshipSchema<TDataSchema extends RelationshipDataSchema> = z.ZodType<{
    data: z.output<TDataSchema>;
}>;

/**
 * Constructs a relationship object schema that wraps a given relationship data schema
 */
export const relationshipSchema = <TDataSchema extends RelationshipDataSchema>(
    schema: TDataSchema,
): RelationshipSchema<TDataSchema> =>
    z.strictObject({
        data: schema as RelationshipDataSchema,
    });

/**
 * Zod schema for a map of named relationships
 */
export type RelationshipsSchema = z.ZodType<
    Record<string, z.output<RelationshipSchema<RelationshipDataSchema>>>
>;

/**
 * Zod schema for a generic JSON:API attributes object
 */
export type AttributesSchema = z.ZodType<Record<string, unknown>>;

/**
 * Configuration object for parsing a resource request
 *
 * Includes optional `idSchema`, `attributesSchema`, and `relationshipsSchema`, and an optional map of
 * `includedTypeSchemas` keyed by type name.
 */
type ParseResourceRequestOptions<
    TIdSchema extends z.ZodType<string> | undefined,
    TType extends string,
    TAttributesSchema extends AttributesSchema | undefined,
    TRelationshipsSchema extends RelationshipsSchema | undefined,
    TIncludedTypeSchemas extends IncludedTypeSchemas | undefined,
> = {
    /** Optional Zod schema to validate the `id` field in the primary resource */
    idSchema?: TIdSchema;

    /** The expected resource `type` value for the primary data object */
    type: TType;

    /** Optional Zod schema for validating the `attributes` object in the request */
    attributesSchema?: TAttributesSchema;

    /** Optional Zod schema for validating the `relationships` object in the request */
    relationshipsSchema?: TRelationshipsSchema;

    /**
     * Optional map of included resource `type` names to their validation schemas
     *
     * Used to validate and organize entries in the top-level `included` array.
     */
    includedTypeSchemas?: TIncludedTypeSchemas;
};

/**
 * A parsed included resource entry
 */
export type IncludedResource<TOptions extends AnyIncludedResourceSchemas> = {
    /** The local identifier (lid) of the included resource */
    lid: string;

    /** The `type` of the included resource */
    type: string;

    /** The `attributes` of the resource, if a schema was provided */
    attributes: TOptions["attributesSchema"] extends AttributesSchema
        ? z.output<TOptions["attributesSchema"]>
        : undefined;

    /** The `relationships` of the resource, if a schema was provided. */
    relationships: TOptions["relationshipsSchema"] extends RelationshipsSchema
        ? z.output<TOptions["relationshipsSchema"]>
        : undefined;
};

/**
 * A container class for looking up included resources of a given type by `lid`
 */
export class IncludedResourceMap<TResourceOptions extends AnyIncludedResourceSchemas> {
    private readonly type: string;
    private resources: Map<string, IncludedResource<TResourceOptions>>;

    public constructor(type: string, resources: Map<string, IncludedResource<TResourceOptions>>) {
        this.type = type;
        this.resources = resources;
    }

    /**
     * Returns the resource with the given `lid` or null if not found
     */
    public safeGet(lid: string): IncludedResource<TResourceOptions> | null {
        return this.resources.get(lid) ?? null;
    }

    /**
     * Returns the resource with the given `lid`, or throws if not included
     *
     * @throws {JsonApiError} if the resource is missing
     */
    public get(lid: string): IncludedResource<TResourceOptions> {
        const resource = this.resources.get(lid);

        if (!resource) {
            throw new JsonApiError({
                status: "422",
                code: "missing_included_resource",
                title: "Missing included resource",
                detail: `A referenced resource of type '${this.type}' and lid '${lid}' is missing in the document`,
            });
        }

        return resource;
    }
}

/**
 * Map of all included resource types and their corresponding resource maps
 */
export type IncludedTypesContainer<T extends IncludedTypeSchemas> = {
    [K in keyof T]: IncludedResourceMap<T[K]>;
};

/**
 * Parsed result from a resource request
 */
export type ParseResourceRequestResult<
    TIdSchema extends z.ZodType<string> | undefined,
    TType extends string,
    TAttributesSchema extends AttributesSchema | undefined,
    TRelationshipsSchema extends RelationshipsSchema | undefined,
    TIncludedTypeSchemas extends IncludedTypeSchemas | undefined,
> = {
    id: TIdSchema extends z.ZodType<string> ? z.output<TIdSchema> : undefined;
    type: TType;
    attributes: TAttributesSchema extends AttributesSchema
        ? z.output<TAttributesSchema>
        : undefined;
    relationships: TRelationshipsSchema extends RelationshipsSchema
        ? z.output<TRelationshipsSchema>
        : undefined;
    includedTypes: TIncludedTypeSchemas extends IncludedTypeSchemas
        ? IncludedTypesContainer<TIncludedTypeSchemas>
        : undefined;
};

/**
 * Describes the schema of an included resource, including optional attributes and relationships
 */
export type IncludedResourceSchemas<
    TAttributesSchema extends AttributesSchema | undefined,
    TRelationshipsSchema extends RelationshipsSchema | undefined,
> = {
    /** Optional Zod schema for validating the `attributes` object */
    attributesSchema?: TAttributesSchema;

    /** Optional Zod schema for validating the `relationships` object */
    relationshipsSchema?: TRelationshipsSchema;
};

// biome-ignore lint/suspicious/noExplicitAny: Required for inference
type AnyIncludedResourceSchemas = IncludedResourceSchemas<any, any>;

/**
 * Map of included resource types to their schemas
 */
export type IncludedTypeSchemas = {
    [key: string]: IncludedResourceSchemas<
        AttributesSchema | undefined,
        RelationshipsSchema | undefined
    >;
};

type IncludedResourceSchema = z.ZodObject<{
    lid: z.ZodType<string>;
    type: z.ZodType<string>;
    attributes: AttributesSchema | z.ZodUndefined;
    relationships: RelationshipsSchema | z.ZodUndefined;
}>;
type IncludedSchema = z.ZodType<z.output<IncludedResourceSchema>[] | undefined>;

const buildIncludedSchema = <TIncludedTypeSchemas extends IncludedTypeSchemas | undefined>(
    includedTypes: TIncludedTypeSchemas,
): IncludedSchema => {
    if (!includedTypes) {
        return z.undefined();
    }

    const includedResourceSchemas: IncludedResourceSchema[] = [];

    for (const [type, schemas] of Object.entries(includedTypes)) {
        includedResourceSchemas.push(
            z.object({
                lid: z.string(),
                type: z.literal(type),
                attributes: schemas.attributesSchema ? schemas.attributesSchema : z.undefined(),
                relationships: schemas.relationshipsSchema
                    ? schemas.relationshipsSchema
                    : z.undefined(),
            }),
        );
    }

    if (includedResourceSchemas.length === 0) {
        return z.array(z.never()).optional();
    }

    if (includedResourceSchemas.length === 1) {
        return z.array(includedResourceSchemas[0]).optional();
    }

    return z
        .array(
            z.discriminatedUnion("type", [
                includedResourceSchemas[0],
                ...includedResourceSchemas.slice(1),
            ]),
        )
        .optional();
};

/**
 * Parses a JSON:API resource request
 *
 * Validates content type, parses the document, and extracts resource and included data according to the provided
 * options.
 *
 * @throws {JsonApiError} for invalid content type or malformed document
 */
export const parseResourceRequest = <
    TIdSchema extends z.ZodType<string> | undefined,
    TType extends string,
    TAttributesSchema extends AttributesSchema | undefined,
    TRelationshipsSchema extends RelationshipsSchema | undefined,
    TIncludedTypeSchemas extends IncludedTypeSchemas | undefined,
>(
    context: BodyContext,
    options: ParseResourceRequestOptions<
        TIdSchema,
        TType,
        TAttributesSchema,
        TRelationshipsSchema,
        TIncludedTypeSchemas
    >,
): ParseResourceRequestResult<
    NoInfer<TIdSchema>,
    NoInfer<TType>,
    NoInfer<TAttributesSchema>,
    NoInfer<TRelationshipsSchema>,
    NoInfer<TIncludedTypeSchemas>
> => {
    const body = parseBody(context);
    const includedSchema = buildIncludedSchema(options.includedTypeSchemas);

    const parseResult = z
        .strictObject({
            data: z.strictObject({
                id: options.idSchema ?? z.undefined(),
                type: fixedTypeSchema(options.type),
                attributes: options.attributesSchema ?? z.undefined(),
                relationships: options.relationshipsSchema ?? z.undefined(),
            }),
            included: includedSchema,
        })
        .safeParse(body);

    if (!parseResult.success) {
        throw new ZodValidationError(parseResult.error.issues, "body");
    }

    const { data, included } = parseResult.data;

    const result: Record<string, unknown> = {
        type: options.type,
    };

    if ("id" in data) {
        result.id = data.id;
    }

    if ("attributes" in data) {
        result.attributes = data.attributes;
    }

    if ("relationships" in data) {
        result.relationships = data.relationships;
    }

    if (options.includedTypeSchemas) {
        const includedTypes = Object.fromEntries(
            Object.keys(options.includedTypeSchemas).map((type) => [type, new Map()]),
        );

        if (included) {
            for (const resource of included) {
                const map = includedTypes[resource.type];
                map.set(resource.lid, resource);
            }
        }

        result.includedTypes = Object.fromEntries(
            Object.entries(options.includedTypeSchemas).map(([type]) => [
                type,
                new IncludedResourceMap(type, includedTypes[type]),
            ]),
        );
    }

    return result as ParseResourceRequestResult<
        TIdSchema,
        TType,
        TAttributesSchema,
        TRelationshipsSchema,
        TIncludedTypeSchemas
    >;
};

/**
 * Parses a JSON:API relationship request and returns an ID
 *
 * The `idSchema` can be made `.nullable`.
 *
 * @throws {JsonApiError} for invalid content type or schema errors
 */
export const parseRelationshipRequest = <TIdSchema extends z.ZodType<string | null> | undefined>(
    context: BodyContext,
    type: string,
    idSchema?: TIdSchema,
): TIdSchema extends z.ZodType<string | null> ? z.output<NoInfer<TIdSchema>> : string => {
    const body = parseBody(context);

    const parseResult = z
        .object({
            data: z.object({
                type: z.literal(type),
                id: (idSchema ?? z.string()) as z.ZodType<string | null>,
            }),
        })
        .safeParse(body);

    if (!parseResult.success) {
        throw new ZodValidationError(parseResult.error.issues, "body");
    }

    return parseResult.data.data.id as TIdSchema extends z.ZodType<string | null>
        ? z.output<NoInfer<TIdSchema>>
        : string;
};

/**
 * Parses a JSON:API relationships request and returns a list of string IDs
 *
 * @throws {JsonApiError} for invalid content type or schema errors
 */
export const parseRelationshipsRequest = (
    context: BodyContext,
    type: string,
    idSchema: z.ZodType<string> = z.string(),
): string[] => {
    const body = parseBody(context);

    const parseResult = z
        .object({
            data: z.array(
                z.object({
                    type: z.literal(type),
                    id: idSchema,
                }),
            ),
        })
        .safeParse(body);

    if (!parseResult.success) {
        throw new ZodValidationError(parseResult.error.issues, "body");
    }

    return parseResult.data.data.map((identifier) => identifier.id);
};

/**
 * Parses and validates the body content as JSON
 *
 * @throws {JsonApiError} if the body is not valid JSON
 */
const parseBody = (context: BodyContext): unknown => {
    validateContentType(context.contentType);

    if (typeof context.body !== "string") {
        return context.body;
    }

    try {
        return JSON.parse(context.body);
    } catch (error) {
        throw new JsonApiError({
            status: "400",
            code: "invalid_json_body",
            title: "Invalid JSON body",
            /* node:coverage ignore next */
            detail: error instanceof Error ? error.message : undefined,
        });
    }
};

/**
 * Validates that the provided content type is supported for JSON:API
 *
 * @throws {JsonApiError} for unsupported media types
 */
const validateContentType = (contentType: string | undefined): void => {
    const parts = fastContentTypeParse.safeParse(contentType ?? "");

    if (parts.type === "") {
        throw new JsonApiError({
            status: "415",
            code: "unsupported_media_type",
            title: "Unsupported Media Type",
            detail: `Media type is missing, use 'application/vnd.api+json'`,
            source: { header: "Content-Type" },
        });
    }

    if (parts.type !== "application/vnd.api+json") {
        throw new JsonApiError({
            status: "415",
            code: "unsupported_media_type",
            title: "Unsupported Media Type",
            detail: `Unsupported media type '${parts.type}', use 'application/vnd.api+json'`,
            source: { header: "Content-Type" },
        });
    }

    const { ext, profile, ...rest } = parts.parameters;

    if (Object.keys(rest).length === 0) {
        return;
    }

    throw new JsonApiError({
        status: "415",
        code: "unsupported_media_type",
        title: "Unsupported Media Type",
        detail: `Unknown media type parameters: ${Object.keys(rest).join(", ")}`,
        source: { header: "Content-Type" },
    });
};
