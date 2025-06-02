import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { JsonApiDocument, JsonApiError } from "@jsonapi-serde/server/common";
import { type JsonApiContextState, sendJsonApiResponse } from "../src/index.js";
import { createKoaMockContext } from "./util.js";

describe("response", () => {
    describe("sendJsonApiResponse", () => {
        it("throws if jsonApiRequestMiddleware is not registered", () => {
            const ctx = createKoaMockContext();
            const document = new JsonApiDocument({ meta: { foo: "bar" } });

            assert.throws(() => sendJsonApiResponse(ctx, document), {
                message: "You must register `jsonApiRequestMiddleware` in Koa",
            });
        });

        it("verifies acceptable media types and sets response status, body, and content-type", () => {
            const ctx = createKoaMockContext<JsonApiContextState>({
                state: {
                    jsonApi: {
                        acceptableTypes: [{ ext: [], profile: [] }],
                    },
                },
            });

            const document = new JsonApiDocument({ meta: { foo: "bar" } }, 201);

            sendJsonApiResponse(ctx, document);

            assert.equal(ctx.status, 201);
            assert.partialDeepStrictEqual(ctx.body, {
                meta: { foo: "bar" },
            });
            assert.equal(ctx.response.headers["content-type"], "application/vnd.api+json");
        });

        it("throws JsonApiError if verifyAcceptMediaType fails", () => {
            const ctx = createKoaMockContext<JsonApiContextState>({
                state: {
                    jsonApi: {
                        acceptableTypes: [],
                    },
                },
            });

            const document = new JsonApiDocument({ meta: { foo: "bar" } });

            assert.throws(
                () => sendJsonApiResponse(ctx, document),
                (error) => {
                    assert(error instanceof JsonApiError);
                    assert.equal(error.status, 406);
                    return true;
                },
            );
        });
    });
});
