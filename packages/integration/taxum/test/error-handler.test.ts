import "../src/augment.js";
import assert from "node:assert/strict";
import consumers from "node:stream/consumers";
import { describe, it } from "node:test";
import { JsonApiError } from "@jsonapi-serde/server/common";
import { ValidationError } from "@taxum/core/extract";
import { StatusCode } from "@taxum/core/http";
import { ClientError } from "@taxum/core/util";
import { jsonApiErrorHandler } from "../src/index.js";

describe("error-handler", () => {
    it("should expose errors with status 4xx", async () => {
        const error = new Error("Already registered") as unknown as Record<string, unknown>;
        error.status = 409;
        error.name = "AlreadyRegisteredError";

        let loggedError: unknown;
        let exposedFlag: boolean | undefined;

        const errorHandler = jsonApiErrorHandler({
            logError: (error, exposed) => {
                loggedError = error;
                exposedFlag = exposed;
            },
        });
        const res = errorHandler(error);

        assert.equal(loggedError, error);
        assert.equal(exposedFlag, true);
        assert.equal(res.status, StatusCode.CONFLICT);

        assert.partialDeepStrictEqual(await consumers.json(res.body.readable), {
            errors: [
                {
                    code: "already_registered",
                    title: "Already registered",
                },
            ],
        });
    });

    it("should expose JsonApiError errors with status < 500", async () => {
        const error = new JsonApiError({
            status: "422",
            code: "unprocessable_entity",
            title: "Invalid data",
        });

        const errorHandler = jsonApiErrorHandler();
        const res = errorHandler(error);

        assert.equal(res.status, StatusCode.UNPROCESSABLE_CONTENT);

        assert.partialDeepStrictEqual(await consumers.json(res.body.readable), {
            errors: [
                {
                    code: "unprocessable_entity",
                    title: "Invalid data",
                },
            ],
        });
    });

    it("should handle unknown errors as internal server error", async () => {
        const error = new Error("Unexpected");
        let loggedError: unknown;
        let exposedFlag: boolean | undefined;

        const errorHandler = jsonApiErrorHandler({
            logError: (error, exposed) => {
                loggedError = error;
                exposedFlag = exposed;
            },
        });
        const res = errorHandler(error);

        assert.equal(loggedError, error);
        assert.equal(exposedFlag, false);
        assert.equal(res.status, StatusCode.INTERNAL_SERVER_ERROR);

        assert.partialDeepStrictEqual(await consumers.json(res.body.readable), {
            errors: [
                {
                    status: "500",
                    code: "internal_server_error",
                    title: "Internal Server Error",
                },
            ],
        });
    });

    it("should handle ClientError", async () => {
        const error = new ClientError(StatusCode.BAD_REQUEST, "Invalid data");

        const errorHandler = jsonApiErrorHandler();
        const res = errorHandler(error);

        assert.equal(res.status, StatusCode.BAD_REQUEST);

        assert.partialDeepStrictEqual(await consumers.json(res.body.readable), {
            errors: [
                {
                    status: "400",
                    code: "bad_request",
                    title: "Bad Request",
                    detail: "Invalid data",
                },
            ],
        });
    });

    it("should call logError callback if provided", async () => {
        const error = new Error("Unexpected");
        let logged = false;

        const errorHandler = jsonApiErrorHandler({
            logError: (thrown, exposed) => {
                logged = true;
                assert.equal(thrown, error);
                assert.equal(exposed, false);
            },
        });
        errorHandler(error);

        assert.equal(logged, true);
    });

    describe("ValidationError", () => {
        it("handles body ValidationError", async () => {
            const error = new ValidationError(
                StatusCode.BAD_REQUEST,
                "Invalid data",
                [
                    {
                        message: "Invalid value",
                        path: ["foo"],
                    },
                ],
                "body",
            );

            const errorHandler = jsonApiErrorHandler();
            const res = errorHandler(error);

            assert.equal(res.status, StatusCode.UNPROCESSABLE_CONTENT);

            assert.partialDeepStrictEqual(await consumers.json(res.body.readable), {
                errors: [
                    {
                        status: "422",
                        code: "validation_failed",
                        title: "Validation failed",
                        detail: "Invalid data",
                        source: {
                            pointer: "/foo",
                        },
                    },
                ],
            });
        });

        it("handles query ValidationError", async () => {
            const error = new ValidationError(
                StatusCode.BAD_REQUEST,
                "Invalid data",
                [
                    {
                        message: "Invalid value",
                        path: ["foo"],
                    },
                ],
                "search_params",
            );

            const errorHandler = jsonApiErrorHandler();
            const res = errorHandler(error);

            assert.equal(res.status, StatusCode.BAD_REQUEST);

            assert.partialDeepStrictEqual(await consumers.json(res.body.readable), {
                errors: [
                    {
                        status: "400",
                        code: "validation_failed",
                        title: "Validation failed",
                        detail: "Invalid data",
                        source: {
                            parameter: "foo",
                        },
                    },
                ],
            });
        });

        it("handles query without path ValidationError", async () => {
            const error = new ValidationError(
                StatusCode.BAD_REQUEST,
                "Invalid data",
                [
                    {
                        message: "Invalid value",
                    },
                ],
                "search_params",
            );

            const errorHandler = jsonApiErrorHandler();
            const res = errorHandler(error);

            assert.partialDeepStrictEqual(await consumers.json(res.body.readable), {
                errors: [{}],
            });
        });

        it("handles query with empty path ValidationError", async () => {
            const error = new ValidationError(
                StatusCode.BAD_REQUEST,
                "Invalid data",
                [
                    {
                        message: "Invalid value",
                        path: [],
                    },
                ],
                "search_params",
            );

            const errorHandler = jsonApiErrorHandler();
            const res = errorHandler(error);

            assert.partialDeepStrictEqual(await consumers.json(res.body.readable), {
                errors: [{}],
            });
        });

        it("handles header ValidationError", async () => {
            const error = new ValidationError(
                StatusCode.BAD_REQUEST,
                "Invalid data",
                [
                    {
                        message: "Invalid value",
                        path: ["x-test"],
                    },
                ],
                "header",
            );

            const errorHandler = jsonApiErrorHandler();
            const res = errorHandler(error);

            assert.partialDeepStrictEqual(await consumers.json(res.body.readable), {
                errors: [
                    {
                        source: {
                            header: "x-test",
                        },
                    },
                ],
            });
        });

        it("handles header with empty path ValidationError", async () => {
            const error = new ValidationError(
                StatusCode.BAD_REQUEST,
                "Invalid data",
                [
                    {
                        message: "Invalid value",
                        path: [],
                    },
                ],
                "header",
            );

            const errorHandler = jsonApiErrorHandler();
            const res = errorHandler(error);

            assert.partialDeepStrictEqual(await consumers.json(res.body.readable), {
                errors: [{}],
            });
        });

        it("handles header with non-string path ValidationError", async () => {
            const error = new ValidationError(
                StatusCode.BAD_REQUEST,
                "Invalid data",
                [
                    {
                        message: "Invalid value",
                        path: [1],
                    },
                ],
                "header",
            );

            const errorHandler = jsonApiErrorHandler();
            const res = errorHandler(error);

            assert.partialDeepStrictEqual(await consumers.json(res.body.readable), {
                errors: [{}],
            });
        });

        it("handles path ValidationError", async () => {
            const error = new ValidationError(
                StatusCode.BAD_REQUEST,
                "Invalid data",
                [
                    {
                        message: "Invalid value",
                        path: ["foo"],
                    },
                ],
                "path",
            );

            const errorHandler = jsonApiErrorHandler();
            const res = errorHandler(error);

            assert.equal(res.status, StatusCode.BAD_REQUEST);

            assert.partialDeepStrictEqual(await consumers.json(res.body.readable), {
                errors: [
                    {
                        status: "400",
                        code: "validation_failed",
                        title: "Validation failed",
                        detail: "Invalid data",
                    },
                ],
            });
        });
    });
});
