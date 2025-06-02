import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bodyContext } from "../src/request.js";
import { createKoaMockContext } from "./util.js";

describe("request", () => {
    describe("bodyContext", () => {
        it("returns BodyContext when body is a string", () => {
            const ctx = createKoaMockContext({
                request: {
                    body: '{"foo":"bar"}',
                    headers: {
                        "content-type": "application/json",
                    },
                },
            });

            const result = bodyContext(ctx);
            assert.equal(result.body, ctx.request.body);
            assert.equal(result.contentType, "application/json");
        });

        it("returns BodyContext when body is a non-null object", () => {
            const ctx = createKoaMockContext({
                request: {
                    body: { foo: "bar" },
                    headers: {
                        "content-type": "application/json",
                    },
                },
            });

            const result = bodyContext(ctx);
            assert.deepEqual(result.body, ctx.request.body);
            assert.equal(result.contentType, "application/json");
        });

        it("throws if body is null", () => {
            const ctx = createKoaMockContext({
                request: {
                    body: null,
                    headers: {
                        "content-type": "application/json",
                    },
                },
            });

            assert.throws(() => bodyContext(ctx), {
                message: "Body must either be a string or an object",
            });
        });

        it("throws if body is a number", () => {
            const ctx = createKoaMockContext({
                request: {
                    body: 5,
                    headers: {
                        "content-type": "application/json",
                    },
                },
            });

            assert.throws(() => bodyContext(ctx), {
                message: "Body must either be a string or an object",
            });
        });

        it("throws if body is a boolean", () => {
            const ctx = createKoaMockContext({
                request: {
                    body: false,
                    headers: {
                        "content-type": "application/json",
                    },
                },
            });

            assert.throws(() => bodyContext(ctx), {
                message: "Body must either be a string or an object",
            });
        });

        it("throws if body is undefined", () => {
            const ctx = createKoaMockContext({
                request: {
                    body: undefined,
                    headers: {
                        "content-type": "application/json",
                    },
                },
            });

            assert.throws(() => bodyContext(ctx), {
                message: "Body must either be a string or an object",
            });
        });
    });
});
