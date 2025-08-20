import { JsonApiDocument, JsonApiError, type TopLevelMembers } from "@jsonapi-serde/server/common";
import { HttpResponse, TO_HTTP_RESPONSE, type ToHttpResponse } from "@taxum/core/http";
import { JSON_API_VERIFY_ACCEPT_MEDIA_TYPE } from "./layer.js";

declare module "@jsonapi-serde/server/common" {
    interface JsonApiDocument extends ToHttpResponse {}
    interface JsonApiError extends ToHttpResponse {}
}

(JsonApiDocument.prototype as unknown as ToHttpResponse)[TO_HTTP_RESPONSE] = function (
    this: JsonApiDocument,
): HttpResponse {
    const response = HttpResponse.builder()
        .status(this.getStatus())
        .header("content-type", this.getContentType())
        .body(JSON.stringify(this.getBody()));

    // We build a minimal new document here so that the GC can
    // immediately dispose of the original document.
    const miniDocument = new JsonApiDocument(
        EMPTY_TOP_LEVEL_MEMBERS,
        undefined,
        this.getMediaTypeOptions(),
    );

    response.extensions.insert(
        JSON_API_VERIFY_ACCEPT_MEDIA_TYPE,
        miniDocument.verifyAcceptMediaType.bind(miniDocument),
    );

    return response;
};

(JsonApiError.prototype as unknown as ToHttpResponse)[TO_HTTP_RESPONSE] = function (
    this: JsonApiError,
): HttpResponse {
    return this.toDocument()[TO_HTTP_RESPONSE]();
};

const EMPTY_TOP_LEVEL_MEMBERS: TopLevelMembers = { meta: {} };
