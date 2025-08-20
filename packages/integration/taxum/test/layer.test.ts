import assert from "node:assert/strict";
import { before, beforeEach, describe, it, mock } from "node:test";
import { JsonApiDocument } from "@jsonapi-serde/server/common";
import type {
    getAcceptableMediaTypes as GetAcceptableMediaTypesType,
    MediaTypeParserError as MediaTypeParserErrorType,
} from "@jsonapi-serde/server/http";
import { HttpRequest, StatusCode, TO_HTTP_RESPONSE } from "@taxum/core/http";
import type { HttpService } from "@taxum/core/service";
import type {
    JSON_API_MEDIA_TYPES as JSON_API_MEDIA_TYPES_TYPE,
    jsonApiMediaTypesLayer as JsonApiMediaTypesLayerType,
} from "../src/layer.js";

describe("layer", () => {
    const getAcceptableMediaTypesMock = mock.fn<typeof GetAcceptableMediaTypesType>();
    let JSON_API_MEDIA_TYPES: typeof JSON_API_MEDIA_TYPES_TYPE;
    let jsonApiMediaTypesLayer: typeof JsonApiMediaTypesLayerType;
    let MediaTypeParserError: typeof MediaTypeParserErrorType;

    before(async () => {
        const exports = await import("@jsonapi-serde/server/http");

        mock.module("@jsonapi-serde/server/http", {
            namedExports: {
                ...exports,
                getAcceptableMediaTypes: getAcceptableMediaTypesMock,
            },
        });

        ({ JSON_API_MEDIA_TYPES, jsonApiMediaTypesLayer } = await import("../src/layer.js"));
        ({ MediaTypeParserError } = await import("@jsonapi-serde/server/http"));
    });

    let nextCalled = false;

    beforeEach(() => {
        nextCalled = false;
    });

    const mockService: HttpService = {
        invoke: () => {
            nextCalled = true;
            return new JsonApiDocument({ meta: {} })[TO_HTTP_RESPONSE]();
        },
    };

    it("should parse and set acceptableTypes extension", async () => {
        const mockTypes = [{ ext: [], profile: [] }] satisfies ReturnType<
            typeof GetAcceptableMediaTypesType
        >;
        getAcceptableMediaTypesMock.mock.mockImplementationOnce(() => mockTypes);

        const req = HttpRequest.builder().header("accept", "application/vnd.api+json").body(null);
        const service = jsonApiMediaTypesLayer.layer(mockService);
        await service.invoke(req);

        assert.equal(nextCalled, true);
        assert(req.extensions.has(JSON_API_MEDIA_TYPES));
    });

    it("should respond with 400 on MediaTypeParserError from getAcceptableMediaTypes", async () => {
        getAcceptableMediaTypesMock.mock.mockImplementationOnce(() => {
            throw new MediaTypeParserError("Invalid Accept header");
        });

        const req = HttpRequest.builder().body(null);
        const service = jsonApiMediaTypesLayer.layer(mockService);
        const res = await service.invoke(req);

        assert.equal(nextCalled, false);
        assert.equal(res.status, StatusCode.BAD_REQUEST);
    });

    it("should rethrow non-MediaTypeParserError errors", async () => {
        const error = new Error("Boom!");
        getAcceptableMediaTypesMock.mock.mockImplementationOnce(() => {
            throw error;
        });

        const req = HttpRequest.builder().body(null);
        const service = jsonApiMediaTypesLayer.layer(mockService);

        assert.rejects(
            async () => {
                await service.invoke(req);
            },
            (thrown) => {
                assert.equal(error, thrown);
                return true;
            },
        );
    });
});
