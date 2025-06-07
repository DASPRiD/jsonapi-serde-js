import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { $ZodIssue } from "zod/v4/core";
import {
    JsonApiError,
    type JsonApiErrorObject,
    ZodValidationError,
    ZodValidationErrorParams,
} from "../../src/common/index.js";

describe("common/error", () => {
    describe("JsonApiError", () => {
        it("should wrap a single error object", () => {
            const error: JsonApiErrorObject = {
                status: "400",
                title: "Bad Request",
                code: "bad_request",
            };
            const wrapped = new JsonApiError(error);
            assert.deepEqual(wrapped.errors, [error]);
            assert.equal(wrapped.status, 400);
        });

        it("should wrap multiple errors with same status", () => {
            const errors: JsonApiErrorObject[] = [
                { status: "404", title: "Not Found" },
                { status: "404", title: "Still Not Found" },
            ];
            const wrapped = new JsonApiError(errors);
            assert.equal(wrapped.status, 404);
        });

        it("should return status 500 if any error has a 5xx status", () => {
            const errors: JsonApiErrorObject[] = [
                { status: "400", title: "Client Error" },
                { status: "500", title: "Server Error" },
            ];
            const wrapped = new JsonApiError(errors);
            assert.equal(wrapped.status, 500);
        });

        it("should return status 400 if no 5xx but multiple different status codes", () => {
            const errors: JsonApiErrorObject[] = [
                { status: "400", title: "Bad Request" },
                { status: "401", title: "Unauthorized" },
            ];
            const wrapped = new JsonApiError(errors);
            assert.equal(wrapped.status, 400);
        });

        it("should default to 500 if no status codes are present", (t) => {
            const spy = t.mock.method(console, "warn", () => {
                // Suppress actual console.warn output
            });

            const errors: JsonApiErrorObject[] = [
                { title: "Something went wrong" },
                { title: "Another error" },
            ];
            const wrapped = new JsonApiError(errors);
            assert.equal(wrapped.status, 500);

            assert.match(spy.mock.calls[0].arguments[0], /No error contained a status code/i);
        });

        it("should throw if constructed with no errors", () => {
            assert.throws(() => new JsonApiError([]), /At least one error must be supplied/);
        });

        it("should create a JsonApiDocument via toDocument()", () => {
            const error: JsonApiErrorObject = { status: "403", title: "Forbidden" };
            const wrapped = new JsonApiError(error);
            const document = wrapped.toDocument();
            assert.deepEqual(document.getBody().errors, [error]);
        });
    });

    describe("ZodValidationError", () => {
        const mockIssue: $ZodIssue = {
            code: "invalid_type",
            message: "Expected string",
            path: ["name"],
            expected: "string",
            input: 5,
        };

        it("should create a JSON:API error from a Zod issue for query param", () => {
            const error = new ZodValidationError([mockIssue], "query");
            assert.equal(error.status, 400);
            assert.equal(error.errors[0].source?.parameter, "name");
        });

        it("should create a JSON:API error from a Zod issue for request body", () => {
            const error = new ZodValidationError([mockIssue], "body");
            assert.equal(error.status, 422);
            assert.equal(error.errors[0].source?.pointer, "/name");
        });

        it("should ignore empty query validation path", () => {
            const error = new ZodValidationError([{ ...mockIssue, path: [] }], "query");
            assert.equal(error.status, 400);
            assert.equal(error.errors[0].source, undefined);
        });

        it("should override defaults from ZodValidationErrorParams", () => {
            const issue: $ZodIssue = {
                code: "custom",
                message: "Custom error",
                path: ["details", 0],
                input: "",
                params: new ZodValidationErrorParams("custom_code", "A detailed explanation", 422),
            };
            const error = new ZodValidationError([issue], "body");

            const errorObject = error.errors[0];
            assert.equal(errorObject.code, "custom_code");
            assert.equal(errorObject.detail, "A detailed explanation");
            assert.equal(errorObject.status, "422");
            assert.equal(errorObject.source?.pointer, "/details/0");
        });

        it("should include meta data", () => {
            const issue: $ZodIssue = {
                code: "invalid_type",
                message: "Invalid type",
                path: ["details", 0],
                input: "",
                expected: "number",
            };
            const error = new ZodValidationError([issue], "body");

            const errorObject = error.errors[0];
            assert.equal(errorObject.code, "invalid_type");
            assert.equal(errorObject.title, "Invalid type");
            assert.equal(errorObject.status, "422");
            assert.deepEqual(errorObject.meta, { expected: "number" });
            assert.equal(errorObject.source?.pointer, "/details/0");
        });

        it("should omit meta field if no metadata exists", () => {
            const issue: $ZodIssue = {
                code: "custom",
                message: "Invalid",
                path: ["username"],
                input: "foo",
            };
            const error = new ZodValidationError([issue], "query");
            assert.equal(error.errors[0].meta, undefined);
        });
    });
});
