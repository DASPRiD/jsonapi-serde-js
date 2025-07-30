import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { expectTypeOf } from "expect-type";
import { z } from "zod/v4";
import { ZodValidationError } from "../../src/common/error.js";
import { createQueryParser } from "../../src/request/query.js";

describe("request/query", () => {
    const parseQuery = createQueryParser({
        include: { allowed: ["author", "comments.author"] },
        sort: {
            allowed: ["title", "createdAt"],
            multiple: false,
        },
        fields: {
            allowed: {
                article: ["title", "body"],
                user: ["name"],
            },
            default: {
                article: ["title"],
            },
        },
        filter: z.object({ published: z.enum(["true", "false"]) }).optional(),
        page: z.object({ number: z.coerce.number().int().min(1) }).optional(),
    });

    it("should parse valid query string correctly", () => {
        const result = parseQuery(
            "include=author&sort=-createdAt&fields[article]=title,body&filter[published]=true&page[number]=2",
        );
        assert.deepEqual(result, {
            include: ["author"],
            sort: [{ field: "createdAt", order: "desc" }],
            fields: {
                article: ["title", "body"],
            },
            filter: { published: "true" },
            page: { number: 2 },
        });
    });

    it("should interpret empty sort parameter as empty array", () => {
        const result = parseQuery("sort=");
        assert.partialDeepStrictEqual(result, { sort: [] });
    });

    it("should interpret empty field parameter as empty array", () => {
        const result = parseQuery("fields[user]=");
        assert.partialDeepStrictEqual(result, { fields: { user: [] } });
    });

    it("should apply defaults when fields and includes are omitted", () => {
        const result = parseQuery("sort=title&filter[published]=false&page[number]=1");
        assert.deepEqual(result.fields.article, ["title"]);
        assert.deepEqual(result.include, []);
        assert.deepEqual(result.sort, [{ field: "title", order: "asc" }]);
    });

    it("should throw for invalid include path", () => {
        assert.throws(
            () => {
                parseQuery("include=invalid.path");
            },
            (error) => {
                assert(error instanceof ZodValidationError);
                assert.equal(error.errors.length, 1);
                assert.equal(error.errors[0].code, "invalid_include_path");
                return true;
            },
        );
    });

    it("should throw for invalid sort field", () => {
        assert.throws(
            () => {
                parseQuery("sort=invalidField");
            },
            (error) => {
                assert(error instanceof ZodValidationError);
                assert.equal(error.errors.length, 1);
                assert.equal(error.errors[0].code, "invalid_sort_field");
                return true;
            },
        );
    });

    it("should throw for too many sort fields when multiple is false", () => {
        assert.throws(
            () => {
                parseQuery("sort=title,createdAt");
            },
            (error) => {
                assert(error instanceof ZodValidationError);
                assert.equal(error.errors.length, 1);
                assert.equal(error.errors[0].code, "too_many_sort_fields");
                return true;
            },
        );
    });

    it("should throw for unknown sparse field", () => {
        assert.throws(
            () => {
                parseQuery("fields[article]=unknown");
            },
            (error) => {
                assert(error instanceof ZodValidationError);
                assert.equal(error.errors.length, 1);
                assert.equal(error.errors[0].code, "unknown_resource_field");
                return true;
            },
        );
    });

    it("should throw for invalid filter value", () => {
        assert.throws(
            () => {
                parseQuery("filter[published]=maybe");
            },
            (error) => {
                assert(error instanceof ZodValidationError);
                assert.equal(error.errors.length, 1);
                assert.equal(error.errors[0].code, "invalid_value");
                return true;
            },
        );
    });

    it("should throw for invalid page value", () => {
        assert.throws(
            () => {
                parseQuery("page[number]=0");
            },
            (error) => {
                assert(error instanceof ZodValidationError);
                assert.equal(error.errors.length, 1);
                assert.equal(error.errors[0].code, "too_small");
                return true;
            },
        );
    });

    it("should allow disabling parameters", () => {
        const parseQuery = createQueryParser({});
        const result = parseQuery("");
        assert.deepEqual(result, {});
    });

    it("should treat empty include as undefined", () => {
        const result = parseQuery("include=");
        assert.deepEqual(result.include, []);
    });
});

const _typeTests = () => {
    const undefinedIncludeAllowed = createQueryParser({
        include: {
            allowed: undefined,
        },
    });
    expectTypeOf<ReturnType<typeof undefinedIncludeAllowed>>().branded.toEqualTypeOf<{
        include: undefined;
        sort: undefined;
        fields: undefined;
        filter: undefined;
        page: undefined;
    }>();

    createQueryParser({
        include: {
            allowed: ["foo"],
            // @ts-expect-error Invalid default
            default: ["bar"],
        },
    });

    const undefinedSortAllowed = createQueryParser({
        sort: {
            allowed: undefined,
        },
    });
    expectTypeOf<ReturnType<typeof undefinedSortAllowed>>().branded.toEqualTypeOf<{
        include: undefined;
        sort: undefined;
        fields: undefined;
        filter: undefined;
        page: undefined;
    }>();

    createQueryParser({
        sort: {
            allowed: ["foo"],
            // @ts-expect-error Invalid default
            default: [{ field: "bar", order: "asc" }],
        },
    });

    const undefinedFieldsAllowed = createQueryParser({
        fields: {
            allowed: undefined,
        },
    });
    expectTypeOf<ReturnType<typeof undefinedFieldsAllowed>>().branded.toEqualTypeOf<{
        include: undefined;
        sort: undefined;
        fields: undefined;
        filter: undefined;
        page: undefined;
    }>();

    createQueryParser({
        fields: {
            allowed: { foo: ["bar"] },
            default: {
                // @ts-expect-error Unknown field
                foo: ["baz"],
            },
        },
    });

    createQueryParser({
        fields: {
            allowed: { foo: ["bar"] },
            default: {
                // @ts-expect-error Unknown type
                bar: [],
            },
        },
    });
};
