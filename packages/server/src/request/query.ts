import { z } from "zod/v4";
import type { $ZodType } from "zod/v4/core";
import { ZodValidationError, ZodValidationErrorParams } from "../common/error.js";
import type { ParentPaths } from "../common/utils.js";
import { type SearchParamsInput, parseSearchParams } from "../http/index.js";

/**
 * Options for the `include` query parameter
 *
 * Defines which related resources are allowed in an `include` request.
 */
export type ParseQueryIncludeOptions<TInclude extends readonly string[] | undefined> = {
    /**
     * Allowed include-paths (e.g., "author", "comments.author")
     *
     * Allowing "comments" automatically allows "comments.author".
     */
    allowed: TInclude;

    /** Default include-paths if none are provided in the query */
    default?: TInclude extends readonly string[] ? ParentPaths<TInclude[number]>[] : undefined;
};

/**
 * Represents a sortable field and its sort direction
 */
export type SortField<TSort extends string> = {
    /** Field name to sort by */
    field: TSort;

    /**
     * Sort direction.
     *
     * - `asc` for ascending
     * - `desc` for descending
     */
    order: "desc" | "asc";
};

/**
 * Represents a list of sortable fields
 */
export type Sort<TSort extends string> = SortField<TSort>[];

/**
 * Options for the `sort` query parameter
 */
export type ParseQuerySortOptions<TFields extends readonly string[] | undefined> = {
    /** List of field names that are allowed to be sorted */
    allowed: TFields;

    /** Default sorting order, if none is provided in the query */
    default?: TFields extends readonly string[] ? Sort<TFields[number]> : undefined;

    /** Whether multiple sort fields are allowed (comma-separated) */
    multiple?: boolean;
};

export type SparseFieldSets = Record<string, readonly string[]>;
export type PartialSparseFieldSets<TFieldSets extends SparseFieldSets> = {
    [K in keyof TFieldSets]?: TFieldSets[K][number][];
};

/**
 * Options for the `fields` (sparse fieldsets) query parameter
 *
 * Allows specifying which fields are allowed per resource type.
 */
export type ParseQuerySparseFieldsetOptions<TAllowed extends SparseFieldSets | undefined> = {
    /** Allowed field names per resource type (e.g., { articles: ["title", "body"] }) */
    allowed: TAllowed;

    /** Default fieldsets to apply when the query omits some or all `fields` */
    default?: TAllowed extends SparseFieldSets ? PartialSparseFieldSets<TAllowed> : undefined;
};

/**
 * Configuration object for creating a JSON:API query parser
 *
 * Omitting a property will disallow it in the query parameters.
 */
export type ParseQueryOptions<
    TInclude extends readonly string[] | undefined,
    TSortFields extends readonly string[] | undefined,
    TSparseFieldSets extends SparseFieldSets | undefined,
    TFilterSchema extends $ZodType | undefined,
    TPageSchema extends $ZodType | undefined,
> = {
    /** Configuration for `include` query param */
    include?: ParseQueryIncludeOptions<TInclude>;

    /** Configuration for `sort` query param */
    sort?: ParseQuerySortOptions<TSortFields>;

    /** Configuration for `fields` query param */
    fields?: ParseQuerySparseFieldsetOptions<TSparseFieldSets>;

    /** Zod schema for validating and parsing the `filter` query param */
    filter?: TFilterSchema;

    /** Zod schema for validating and parsing the `page` query param */
    page?: TPageSchema;
};

/**
 * Structured result returned by the query parser
 */
export type ParseQueryResult<
    TInclude extends readonly string[] | undefined,
    TSortFields extends readonly string[] | undefined,
    TSparseFieldSets extends SparseFieldSets | undefined,
    TFilterSchema extends $ZodType | undefined,
    TPageSchema extends $ZodType | undefined,
> = {
    include: undefined extends TInclude
        ? undefined
        : TInclude extends readonly string[]
          ? ParentPaths<TInclude[number]>[]
          : undefined;
    sort: undefined extends TSortFields
        ? undefined
        : TSortFields extends readonly string[]
          ? Sort<TSortFields[number]>
          : undefined;
    fields: undefined extends TSparseFieldSets
        ? undefined
        : TSparseFieldSets extends SparseFieldSets
          ? PartialSparseFieldSets<TSparseFieldSets>
          : undefined;
    filter: TFilterSchema extends $ZodType ? z.output<TFilterSchema> : undefined;
    page: TPageSchema extends $ZodType ? z.output<TPageSchema> : undefined;
};

/**
 * Builds a schema to validate and transform the `include` parameter
 */
const buildIncludeSchema = (options: ParseQueryIncludeOptions<readonly string[]>) =>
    z
        .string()
        .transform((paths) => (paths === "" ? [] : paths.split(",")))
        .check((context) => {
            for (const path of context.value) {
                if (
                    !options.allowed.some((value) => value === path || value.startsWith(`${path}.`))
                ) {
                    context.issues.push({
                        code: "custom",
                        message: "Invalid include path",
                        input: context.value,
                        continue: true,
                        params: new ZodValidationErrorParams(
                            "invalid_include_path",
                            `Path '${path}' cannot be included`,
                        ),
                    });
                }
            }
        })
        .default(options.default ?? []);

/**
 * Builds a schema to validate and transform the `sort` parameter
 */
const buildSortSchema = <TSortFields extends readonly string[]>(
    options: ParseQuerySortOptions<TSortFields>,
) =>
    z
        .string()
        .transform((fields): Sort<string> => {
            if (fields === "") {
                return [];
            }

            return fields.split(",").map((field) => {
                if (field.startsWith("-")) {
                    return { field: field.substring(1), order: "desc" };
                }

                return { field, order: "asc" };
            });
        })
        .check((context) => {
            if (context.value.length > 1 && !options.multiple) {
                context.issues.push({
                    code: "custom",
                    message: "Too many sort fields",
                    input: context.value,
                    continue: true,
                    params: new ZodValidationErrorParams(
                        "too_many_sort_fields",
                        "Only a single sort field is allowed",
                    ),
                });
                return;
            }

            for (const field of context.value) {
                if (!(options.allowed as readonly string[]).includes(field.field)) {
                    context.issues.push({
                        code: "custom",
                        message: "Invalid sort field",
                        input: context.value,
                        continue: true,
                        params: new ZodValidationErrorParams(
                            "invalid_sort_field",
                            `Field '${field.field}]' cannot be sorted by`,
                        ),
                    });
                }
            }
        })
        .default(options.default ?? []);

/**
 * Builds a schema to validate and transform the `fields` parameter
 */
const buildSparseFieldsetSchema = <TSparseFieldSets extends SparseFieldSets>(
    options: ParseQuerySparseFieldsetOptions<TSparseFieldSets>,
) =>
    (
        z.strictObject(
            Object.fromEntries(
                Object.entries(options.allowed).map(([type, allowedFields]) => [
                    type,
                    z
                        .string()
                        .transform((fields) => (fields === "" ? [] : fields.split(",")))
                        .check((context) => {
                            for (const field of context.value) {
                                if (!allowedFields.includes(field)) {
                                    context.issues.push({
                                        code: "custom",
                                        message: "Unknown resource field",
                                        input: context.value,
                                        continue: true,
                                        params: new ZodValidationErrorParams(
                                            "unknown_resource_field",
                                            `Resource '${type}' has no field with name '${field}'`,
                                        ),
                                    });
                                }
                            }
                        })
                        .optional(),
                ]),
            ),
        ) as unknown as z.ZodType<PartialSparseFieldSets<TSparseFieldSets>>
    )
        .default({})
        .transform((fieldSets) => {
            /* node:coverage disable */
            if (!options.default) {
                return fieldSets;
            }
            /* node:coverage enable */

            return { ...options.default, ...fieldSets };
        });

/**
 * A query parser that parses a JSON:API-style query string into a strongly typed object.
 */
export type QueryParser<
    TInclude extends readonly string[] | undefined,
    TSortFields extends readonly string[] | undefined,
    TSparseFieldSets extends SparseFieldSets | undefined,
    TFilterSchema extends $ZodType | undefined,
    TPageSchema extends $ZodType | undefined,
> = (
    searchParams: SearchParamsInput,
) => ParseQueryResult<TInclude, TSortFields, TSparseFieldSets, TFilterSchema, TPageSchema>;

/**
 * Creates a query parser for JSON:API-compliant query strings.
 *
 * @example
 * ```ts
 * import { createQueryParser } from "jsonapi-serde/request";
 *
 * const parsePostQuery = createQueryParser({
 *   include: { allowed: ["author", "comments.author"] },
 *   sort: { allowed: ["title", "createdAt"], multiple: false },
 *   fields: {
 *     allowed: {
 *       articles: ["title", "body"],
 *       users: ["name"],
 *     },
 *   },
 * });
 *
 * const query = parsePostQuery("include=author&sort=-createdAt&fields[articles]=title,body");
 * ```
 */
export const createQueryParser = <
    const TInclude extends readonly string[] | undefined,
    const TSortFields extends readonly string[] | undefined,
    const TSparseFieldSets extends SparseFieldSets | undefined,
    TFilterSchema extends $ZodType | undefined,
    TPageSchema extends $ZodType | undefined,
>(
    options: ParseQueryOptions<TInclude, TSortFields, TSparseFieldSets, TFilterSchema, TPageSchema>,
): QueryParser<
    NoInfer<TInclude>,
    NoInfer<TSortFields>,
    NoInfer<TSparseFieldSets>,
    NoInfer<TFilterSchema>,
    NoInfer<TPageSchema>
> => {
    const schema = z.strictObject({
        include: options.include?.allowed
            ? buildIncludeSchema(options.include as ParseQueryIncludeOptions<readonly string[]>)
            : z.undefined({ error: "'include' parameter is not supported" }),
        sort: options.sort?.allowed
            ? buildSortSchema(options.sort as ParseQuerySortOptions<readonly string[]>)
            : z.undefined({ error: "'sort' parameter is not supported" }),
        fields: options.fields?.allowed
            ? buildSparseFieldsetSchema(
                  options.fields as ParseQuerySparseFieldsetOptions<SparseFieldSets>,
              )
            : z.undefined({ error: "'fields' parameter is not supported" }),
        filter: options.filter
            ? options.filter
            : z.undefined({ error: "'filter' parameter is not supported" }),
        page: options.page
            ? options.page
            : z.undefined({ error: "'page' parameter is not supported" }),
    });

    return (input: SearchParamsInput) => {
        const parseResult = schema.safeParse(parseSearchParams(input));

        if (!parseResult.success) {
            throw new ZodValidationError(parseResult.error.issues, "query");
        }

        return parseResult.data as ParseQueryResult<
            TInclude,
            TSortFields,
            TSparseFieldSets,
            TFilterSchema,
            TPageSchema
        >;
    };
};
