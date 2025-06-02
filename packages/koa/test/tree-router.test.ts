import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { JsonApiError } from "@jsonapi-serde/core/common";
import { treeRouterMethodNotAllowedHandler } from "../src/index.js";
import { createKoaMockContext } from "./util.js";

describe("tree-router", () => {
    describe("treeRouterMethodNotAllowedHandler", () => {
        it("throws 404 Not Found JSON:API error and removes 'allow' header when allow header is empty", () => {
            const ctx = createKoaMockContext({
                response: {
                    headers: {
                        allow: "",
                    },
                },
            });

            assert.throws(
                () => {
                    treeRouterMethodNotAllowedHandler(ctx);
                },
                (error) => {
                    assert(error instanceof JsonApiError);
                    assert.equal(error.errors.length, 1);
                    assert.equal(error.errors[0].status, "404");
                    assert.equal(error.errors[0].code, "not_found");
                    assert.equal(error.errors[0].title, "Resource not found");
                    assert.equal(ctx.response.headers.allow, undefined);
                    return true;
                },
            );
        });

        it("throws 405 Method Not Allowed JSON:API error with allowed methods in detail when allow header is set", () => {
            const allowedMethods = "GET, POST";

            const ctx = createKoaMockContext({
                response: {
                    headers: {
                        allow: allowedMethods,
                    },
                },
            });

            assert.throws(
                () => {
                    treeRouterMethodNotAllowedHandler(ctx);
                },
                (error) => {
                    assert(error instanceof JsonApiError);
                    assert.equal(error.errors.length, 1);
                    assert.equal(error.errors[0].status, "405");
                    assert.equal(error.errors[0].code, "method_not_allowed");
                    assert.equal(error.errors[0].title, "Method not allowed");
                    assert.equal(error.errors[0].detail, `Allowed methods: ${allowedMethods}`);
                    assert.equal(ctx.response.headers.allow, allowedMethods);
                    return true;
                },
            );
        });
    });
});
