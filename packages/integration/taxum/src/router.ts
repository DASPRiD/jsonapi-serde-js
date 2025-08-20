import "./augment.js";
import { JsonApiError } from "@jsonapi-serde/server/common";
import { type HttpResponse, TO_HTTP_RESPONSE } from "@taxum/core/http";
import type { Handler } from "@taxum/core/routing";

export const notFoundHandler: Handler = (): HttpResponse => {
    return new JsonApiError({
        status: "404",
        code: "not_found",
        title: "Resource not found",
    })[TO_HTTP_RESPONSE]();
};

export const methodNotAllowedHandler: Handler = (): HttpResponse => {
    return new JsonApiError({
        status: "405",
        code: "method_not_allowed",
        title: "Method not allowed",
    })[TO_HTTP_RESPONSE]();
};
