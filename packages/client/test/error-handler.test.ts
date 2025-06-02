import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { $ZodError } from "zod/v4/core";
import { type ErrorObject, handleJsonApiError } from "../src/index.js";
import { JsonApiError } from "../src/index.js";

const mockErrorObject: ErrorObject = {
    status: "404",
    title: "Resource not found",
    detail: "The requested resource does not exist.",
};

const validErrorDocument = {
    errors: [mockErrorObject],
    meta: { traceId: "abc123" },
};

describe("error-handler", () => {
    describe("handleJsonApiError", () => {
        it("does nothing for successful response", async () => {
            const response = new Response(null, {
                status: 200,
                headers: { "Content-Type": "application/vnd.api+json" },
            });

            await assert.doesNotReject(() => handleJsonApiError(response));
        });

        it("throws JsonApiError for a valid error response", async () => {
            const body = JSON.stringify(validErrorDocument);
            const response = new Response(body, {
                status: 404,
                headers: { "Content-Type": "application/vnd.api+json" },
            });

            try {
                await handleJsonApiError(response);
                assert.fail("Expected JsonApiError was not thrown");
            } catch (err) {
                assert(err instanceof JsonApiError);
                assert.equal(err.status, 404);
                assert.deepEqual(err.errors, validErrorDocument.errors);
                assert.deepEqual(err.meta, validErrorDocument.meta);
                assert.match(err.message, /Failed to perform request/);
            }
        });

        it("throws generic error for invalid content type", async () => {
            const response = new Response("{}", {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });

            await assert.rejects(() => handleJsonApiError(response), /invalid content type/i);
        });

        it("throws $ZodError error for missing `errors` field", async () => {
            const malformed = { meta: { something: "else" } };
            const response = new Response(JSON.stringify(malformed), {
                status: 400,
                headers: { "Content-Type": "application/vnd.api+json" },
            });

            await assert.rejects(() => handleJsonApiError(response), $ZodError);
        });

        it("throws $ZodError error for empty `errors` array", async () => {
            const malformed = { errors: [] };
            const response = new Response(JSON.stringify(malformed), {
                status: 422,
                headers: { "Content-Type": "application/vnd.api+json" },
            });

            await assert.rejects(() => handleJsonApiError(response), $ZodError);
        });
    });
});
