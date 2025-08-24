import "../src/augment.js";
import assert from "node:assert/strict";
import consumers from "node:stream/consumers";
import { describe, it } from "node:test";
import { HttpRequest, HttpResponse } from "@taxum/core/http";
import { methodNotAllowedHandler, notFoundHandler } from "../src/index.js";

describe("router", () => {
    describe("notFoundHandler", () => {
        it("returns 404", async () => {
            const req = HttpRequest.builder().body(null);
            const res = HttpResponse.from(await notFoundHandler(req));

            assert.partialDeepStrictEqual(await consumers.json(res.body.readable), {
                errors: [
                    {
                        status: "404",
                        code: "not_found",
                        title: "Resource not found",
                    },
                ],
            });
        });
    });

    describe("methodNotAllowedHandler", () => {
        it("returns 404", async () => {
            const req = HttpRequest.builder().body(null);
            const res = HttpResponse.from(await methodNotAllowedHandler(req));

            assert.partialDeepStrictEqual(await consumers.json(res.body.readable), {
                errors: [
                    {
                        status: "405",
                        code: "method_not_allowed",
                        title: "Method not allowed",
                    },
                ],
            });
        });
    });
});
