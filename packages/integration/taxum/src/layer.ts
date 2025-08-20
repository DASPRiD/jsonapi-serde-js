import "./augment.js";
import { type JsonApiDocument, JsonApiError } from "@jsonapi-serde/server/common";
import {
    getAcceptableMediaTypes,
    type JsonApiMediaType,
    MediaTypeParserError,
} from "@jsonapi-serde/server/http";
import {
    ExtensionKey,
    type HttpRequest,
    type HttpResponse,
    TO_HTTP_RESPONSE,
} from "@taxum/core/http";
import { layerFn } from "@taxum/core/layer";
import type { HttpService } from "@taxum/core/service";

export const JSON_API_MEDIA_TYPES = new ExtensionKey<JsonApiMediaType[]>("JSON:API Media Types");
export const JSON_API_VERIFY_ACCEPT_MEDIA_TYPE = new ExtensionKey<
    typeof JsonApiDocument.prototype.verifyAcceptMediaType
>("JSON:API Document");

/**
 * Layer that parses and validates the `Accept` header for JSON:API media types.
 *
 * On success, adds acceptable media types to the request extensions.
 * On failure, responds with HTTP 400 and a JSON:API error document.
 */
export const jsonApiMediaTypesLayer = layerFn((inner: HttpService) => new JsonApiMediaTypes(inner));

class JsonApiMediaTypes implements HttpService {
    private readonly inner: HttpService;

    public constructor(inner: HttpService) {
        this.inner = inner;
    }

    public async invoke(req: HttpRequest): Promise<HttpResponse> {
        let acceptableMediaTypes: JsonApiMediaType[];

        try {
            acceptableMediaTypes = getAcceptableMediaTypes(req.headers.get("accept") ?? "");
        } catch (error) {
            /* node:coverage disable */
            if (!(error instanceof MediaTypeParserError)) {
                throw error;
            }
            /* node:coverage enable */

            return new JsonApiError({
                status: "400",
                code: "bad_request",
                title: "Bad Request",
                detail: error.message,
                source: {
                    header: "accept",
                },
            })[TO_HTTP_RESPONSE]();
        }

        req.extensions.insert(JSON_API_MEDIA_TYPES, acceptableMediaTypes);

        const res = await this.inner.invoke(req);

        if (res.status.isSuccess()) {
            res.extensions.get(JSON_API_VERIFY_ACCEPT_MEDIA_TYPE)?.(acceptableMediaTypes);
        }

        return res;
    }
}
