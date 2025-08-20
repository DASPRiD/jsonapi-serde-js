import assert from "node:assert/strict";
import consumers from "node:stream/consumers";
import {
    type AttributesSchema,
    type BodyContext,
    type IncludedTypeSchemas,
    type ParseQueryResult,
    type ParseResourceRequestOptions,
    type ParseResourceRequestResult,
    parseRelationshipRequest,
    parseRelationshipsRequest,
    parseResourceRequest,
    type QueryParser,
    type RelationshipsSchema,
    type SparseFieldSets,
} from "@jsonapi-serde/server/request";
import type { Extractor } from "@taxum/core/extract";
import type { HttpRequest } from "@taxum/core/http";
import { PATH_PARAMS } from "@taxum/core/routing";
import { z } from "zod";
import type { $ZodType } from "zod/v4/core";

/**
 * Extractor which extracts query params based on a JSON:API query parser.
 *
 * @see {@link QueryParser}
 */
export const jsonApiQuery =
    <
        TInclude extends readonly string[] | undefined,
        TSortFields extends readonly string[] | undefined,
        TSparseFieldSets extends SparseFieldSets | undefined,
        TFilterSchema extends $ZodType | undefined,
        TPageSchema extends $ZodType | undefined,
    >(
        parse: QueryParser<TInclude, TSortFields, TSparseFieldSets, TFilterSchema, TPageSchema>,
    ): Extractor<
        ParseQueryResult<TInclude, TSortFields, TSparseFieldSets, TFilterSchema, TPageSchema>
    > =>
    (
        req: HttpRequest,
    ): ParseQueryResult<TInclude, TSortFields, TSparseFieldSets, TFilterSchema, TPageSchema> => {
        return parse(req.uri.searchParams);
    };

/**
 * Extractor which extracts a JSON:API resource from the body.
 *
 * @see {@link parseResourceRequest}
 */
export const jsonApiResource =
    <
        TIdSchema extends $ZodType<string> | undefined,
        TType extends string,
        TAttributesSchema extends AttributesSchema | undefined,
        TRelationshipsSchema extends RelationshipsSchema | undefined,
        TIncludedTypeSchemas extends IncludedTypeSchemas | undefined,
    >(
        options: ParseResourceRequestOptions<
            TIdSchema,
            TType,
            TAttributesSchema,
            TRelationshipsSchema,
            TIncludedTypeSchemas
        >,
        idPathParam?: string,
    ): Extractor<
        ParseResourceRequestResult<
            NoInfer<TIdSchema>,
            NoInfer<TType>,
            NoInfer<TAttributesSchema>,
            NoInfer<TRelationshipsSchema>,
            NoInfer<TIncludedTypeSchemas>
        >
    > =>
    async (
        req: HttpRequest,
    ): Promise<
        ParseResourceRequestResult<
            NoInfer<TIdSchema>,
            NoInfer<TType>,
            NoInfer<TAttributesSchema>,
            NoInfer<TRelationshipsSchema>,
            NoInfer<TIncludedTypeSchemas>
        >
    > => {
        let idSchema = options.idSchema;

        if (idPathParam) {
            const pathParams = req.extensions.get(PATH_PARAMS);
            assert(pathParams, "Path parameters missing");
            assert(idPathParam in pathParams, `Path parameter "${idPathParam}" missing`);
            const pathId = pathParams[idPathParam];

            // We have to apply some type hacks here to support this use-case.
            // If no id schema was defined, it doesn't hurt to set one here.
            // If one was supplied, we know that the input must be a string, so
            // it's safe to pipe from a literal.
            idSchema = (idSchema
                ? z.literal(pathId).pipe(idSchema as $ZodType<unknown, string>)
                : z.literal(pathId)) as unknown as TIdSchema;
        }

        const context = await createBodyContext(req);
        return parseResourceRequest(context, { ...options, idSchema });
    };

/**
 * Extractor which extracts a to-one JSON:API relationship from the body.
 *
 * @see {@link parseRelationshipRequest}
 */
export const jsonApiRelationship =
    <TIdSchema extends $ZodType<string | null> | undefined>(
        type: string,
        idSchema?: TIdSchema,
    ): Extractor<
        TIdSchema extends $ZodType<string | null> ? z.output<NoInfer<TIdSchema>> : string
    > =>
    async (
        req: HttpRequest,
    ): Promise<
        TIdSchema extends $ZodType<string | null> ? z.output<NoInfer<TIdSchema>> : string
    > => {
        const context = await createBodyContext(req);
        return parseRelationshipRequest(context, type, idSchema);
    };

/**
 * Extractor which extracts to-many JSON:API relationships from the body.
 *
 * @see {@link parseRelationshipsRequest}
 */
export const jsonApiRelationships =
    (type: string, idSchema?: $ZodType<string>): Extractor<string[]> =>
    async (req: HttpRequest): Promise<string[]> => {
        const context = await createBodyContext(req);
        return parseRelationshipsRequest(context, type, idSchema);
    };

/**
 * Creates a {@link BodyContext} from an {@link HttpRequest}.
 */
const createBodyContext = async (req: HttpRequest): Promise<BodyContext> => {
    const body = await consumers.text(req.body);

    return {
        body: body,
        /* node:coverage ignore next */
        contentType: req.headers.get("content-type") ?? undefined,
    };
};
