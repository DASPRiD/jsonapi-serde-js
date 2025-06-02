import assert from "node:assert/strict";
import { before, beforeEach, describe, it, mock } from "node:test";
import { JsonApiError } from "@jsonapi-serde/core/common";
import type {
    getAcceptableMediaTypes as GetAcceptableMediaTypesType,
    ParserError as ParserErrorType,
} from "@jsonapi-serde/core/request";
import createHttpError from "http-errors";
import type { ParameterizedContext } from "koa";
import type {
    JsonApiContextState,
    jsonApiErrorMiddleware as JsonApiErrorMiddlewareType,
    jsonApiRequestMiddleware as JsonApiRequestMiddlewareType,
} from "../src/middleware.js";
import { createKoaMockContext } from "./util.js";

describe("middleware", () => {
    const getAcceptableMediaTypesMock = mock.fn<typeof GetAcceptableMediaTypesType>();
    let jsonApiErrorMiddleware: typeof JsonApiErrorMiddlewareType;
    let jsonApiRequestMiddleware: typeof JsonApiRequestMiddlewareType;
    let ParserError: typeof ParserErrorType;

    before(async () => {
        const exports = await import("@jsonapi-serde/core/request");

        mock.module("@jsonapi-serde/core/request", {
            namedExports: {
                ...exports,
                getAcceptableMediaTypes: getAcceptableMediaTypesMock,
            },
        });

        ({ jsonApiErrorMiddleware, jsonApiRequestMiddleware } = await import(
            "../src/middleware.js"
        ));
        ({ ParserError } = await import("@jsonapi-serde/core/request"));
    });

    let ctx: ParameterizedContext<Partial<JsonApiContextState>>;
    let nextCalled = false;

    beforeEach(() => {
        nextCalled = false;
        ctx = createKoaMockContext({
            request: {
                headers: {
                    accept: "application/vnd.api+json",
                },
            },
        });
    });

    describe("jsonApiRequestMiddleware", () => {
        it("should parse and set acceptableTypes on ctx.state.jsonApi", async () => {
            const mockTypes = [{ ext: [], profile: [] }] satisfies ReturnType<
                typeof GetAcceptableMediaTypesType
            >;
            getAcceptableMediaTypesMock.mock.mockImplementationOnce(() => mockTypes);

            const middleware = jsonApiRequestMiddleware();
            await middleware(ctx, async () => {
                nextCalled = true;
            });

            assert.equal(nextCalled, true);
            assert.deepEqual(ctx.state.jsonApi?.acceptableTypes, mockTypes);
        });

        it("should respond with 400 on ParserError from getAcceptableMediaTypes", async () => {
            getAcceptableMediaTypesMock.mock.mockImplementationOnce(() => {
                throw new ParserError("Invalid Accept header");
            });

            const middleware = jsonApiRequestMiddleware();
            await middleware(ctx, async () => {
                nextCalled = true;
            });

            assert.equal(nextCalled, false);
            assert.equal(ctx.status, 400);
            assert(ctx.body);
            assert.equal(ctx.response.headers["content-type"], "application/vnd.api+json");
        });

        it("should rethrow non-ParserError errors", async () => {
            const error = new Error("Boom!");
            getAcceptableMediaTypesMock.mock.mockImplementationOnce(() => {
                throw error;
            });

            const middleware = jsonApiRequestMiddleware();

            assert.rejects(
                async () => {
                    await middleware(ctx, async () => {
                        nextCalled = true;
                    });
                },
                (thrown) => {
                    assert.equal(error, thrown);
                    return true;
                },
            );
        });
    });

    describe("jsonApiErrorMiddleware", () => {
        it("should expose HTTP errors with expose true", async () => {
            const error = createHttpError(404);

            let loggedError: unknown;
            let exposedFlag: boolean | undefined;

            const middleware = jsonApiErrorMiddleware({
                logError: (error, exposed) => {
                    loggedError = error;
                    exposedFlag = exposed;
                },
            });

            await middleware(ctx, () => {
                throw error;
            });

            assert.equal(loggedError, error);
            assert.equal(exposedFlag, true);
            assert.equal(ctx.status, 404);

            assert.partialDeepStrictEqual(ctx.body, {
                errors: [
                    {
                        title: "Not Found",
                    },
                ],
            });
        });

        it("should expose errors with status 4xx", async () => {
            const error = new Error("Already registered") as unknown as Record<string, unknown>;
            error.status = 409;
            error.name = "AlreadyRegisteredError";

            let loggedError: unknown;
            let exposedFlag: boolean | undefined;

            const middleware = jsonApiErrorMiddleware({
                logError: (error, exposed) => {
                    loggedError = error;
                    exposedFlag = exposed;
                },
            });

            await middleware(ctx, () => {
                throw error;
            });

            assert.equal(loggedError, error);
            assert.equal(exposedFlag, true);
            assert.equal(ctx.status, 409);

            assert.partialDeepStrictEqual(ctx.body, {
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

            const middleware = jsonApiErrorMiddleware();

            await middleware(ctx, () => {
                throw error;
            });

            assert.equal(ctx.status, 422);

            assert.partialDeepStrictEqual(ctx.body, {
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

            const middleware = jsonApiErrorMiddleware({
                logError: (error, exposed) => {
                    loggedError = error;
                    exposedFlag = exposed;
                },
            });

            await middleware(ctx, () => {
                throw error;
            });

            assert.equal(loggedError, error);
            assert.equal(exposedFlag, false);
            assert.equal(ctx.status, 500);

            assert.partialDeepStrictEqual(ctx.body, {
                errors: [
                    {
                        code: "internal_server_error",
                        title: "Internal Server Error",
                    },
                ],
            });
        });

        it("should pass through successfully if no error thrown", async () => {
            const middleware = jsonApiErrorMiddleware();
            await middleware(ctx, async () => {
                ctx.status = 200;
                ctx.body = "foo";
                nextCalled = true;
            });

            assert.equal(nextCalled, true);
            assert.equal(ctx.status, 200);
            assert.equal(ctx.body, "foo");
        });

        it("should call logError callback if provided", async () => {
            const error = new Error("Unexpected");
            let logged = false;

            const middleware = jsonApiErrorMiddleware({
                logError: (thrown, exposed) => {
                    logged = true;
                    assert.equal(thrown, error);
                    assert.equal(exposed, false);
                },
            });

            await middleware(ctx, () => {
                throw error;
            });

            assert.equal(logged, true);
        });
    });
});
