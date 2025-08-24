import "../src/augment.js";
import assert from "node:assert/strict";
import consumers from "node:stream/consumers";
import { describe, it } from "node:test";
import { JsonApiDocument, JsonApiError } from "@jsonapi-serde/server/common";
import { StatusCode, TO_HTTP_RESPONSE } from "@taxum/core/http";
import { JSON_API_VERIFY_ACCEPT_MEDIA_TYPE } from "../src/index.js";

describe("augment", () => {
    it("augments JsonApiDocument", async () => {
        const document = new JsonApiDocument({ meta: {} }, 201);
        const res = document[TO_HTTP_RESPONSE]();

        const ext = res.extensions.get(JSON_API_VERIFY_ACCEPT_MEDIA_TYPE);
        assert(ext);
        ext([{ ext: [], profile: [] }]);

        assert.equal(res.status, StatusCode.CREATED);
        assert.partialDeepStrictEqual(await consumers.json(res.body.readable), {
            jsonapi: { version: "1.1" },
        });
    });

    it("augments JsonApiError", async () => {
        const error = new JsonApiError({ status: "400" });
        const res = error[TO_HTTP_RESPONSE]();

        const ext = res.extensions.get(JSON_API_VERIFY_ACCEPT_MEDIA_TYPE);
        assert(ext);
        ext([{ ext: [], profile: [] }]);

        assert.equal(res.status, StatusCode.BAD_REQUEST);
        assert.partialDeepStrictEqual(await consumers.json(res.body.readable), {
            jsonapi: { version: "1.1" },
        });
    });
});
