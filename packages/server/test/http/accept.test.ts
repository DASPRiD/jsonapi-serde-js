import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AcceptParser, type ParsedAccept, getAcceptableMediaTypes } from "../../src/http/accept.js";
import { MediaTypeParserError } from "../../src/http/media-type-parser.js";

describe("http/accept", () => {
    describe("AcceptParser", () => {
        const validHeaders: [string, string, ParsedAccept][] = [
            [
                "empty",
                " \t ",
                [{ type: "*", subType: "*", parameters: {}, weight: 1, acceptExt: {} }],
            ],
            [
                "all types",
                "*/*",
                [{ type: "*", subType: "*", parameters: {}, weight: 1, acceptExt: {} }],
            ],
            [
                "all sub-types",
                "text/*",
                [{ type: "text", subType: "*", parameters: {}, weight: 1, acceptExt: {} }],
            ],
            [
                "simple type",
                "application/json",
                [
                    {
                        type: "application",
                        subType: "json",
                        parameters: {},
                        weight: 1,
                        acceptExt: {},
                    },
                ],
            ],
            [
                "type with weight",
                "application/json ; q=0.5",
                [
                    {
                        type: "application",
                        subType: "json",
                        parameters: {},
                        weight: 0.5,
                        acceptExt: {},
                    },
                ],
            ],
            [
                "multiple types",
                "application/json,application/xml",
                [
                    {
                        type: "application",
                        subType: "json",
                        parameters: {},
                        weight: 1,
                        acceptExt: {},
                    },
                    {
                        type: "application",
                        subType: "xml",
                        parameters: {},
                        weight: 1,
                        acceptExt: {},
                    },
                ],
            ],
            [
                "multiple types with spaces",
                "application/json , application/xml",
                [
                    {
                        type: "application",
                        subType: "json",
                        parameters: {},
                        weight: 1,
                        acceptExt: {},
                    },
                    {
                        type: "application",
                        subType: "xml",
                        parameters: {},
                        weight: 1,
                        acceptExt: {},
                    },
                ],
            ],
            [
                "type with parameter",
                "application/json ; foo=bar",
                [
                    {
                        type: "application",
                        subType: "json",
                        parameters: { foo: "bar" },
                        weight: 1,
                        acceptExt: {},
                    },
                ],
            ],
            [
                "type with multiple parameters",
                "application/json ; foo=bar;baz=bat",
                [
                    {
                        type: "application",
                        subType: "json",
                        parameters: { foo: "bar", baz: "bat" },
                        weight: 1,
                        acceptExt: {},
                    },
                ],
            ],
            [
                "type with accept ext",
                "application/json ; q=1; foo=bar; baz=bat",
                [
                    {
                        type: "application",
                        subType: "json",
                        parameters: {},
                        weight: 1,
                        acceptExt: { foo: "bar", baz: "bat" },
                    },
                ],
            ],
            [
                "type with all params",
                "application/json ; foo=bar;q=1; foo=baz",
                [
                    {
                        type: "application",
                        subType: "json",
                        parameters: { foo: "bar" },
                        weight: 1,
                        acceptExt: { foo: "baz" },
                    },
                ],
            ],
            [
                "type with quoted parameter",
                'application/json ; foo="bar\\",;baz"',
                [
                    {
                        type: "application",
                        subType: "json",
                        parameters: { foo: 'bar",;baz' },
                        weight: 1,
                        acceptExt: {},
                    },
                ],
            ],
            [
                "multiple types with weights",
                "application/json ; q=0.5 \t , text/plain;q=0.6",
                [
                    {
                        type: "text",
                        subType: "plain",
                        parameters: {},
                        weight: 0.6,
                        acceptExt: {},
                    },
                    {
                        type: "application",
                        subType: "json",
                        parameters: {},
                        weight: 0.5,
                        acceptExt: {},
                    },
                ],
            ],
        ];

        for (const [name, header, expected] of validHeaders) {
            it(`should match ${name}`, () => {
                const actual = AcceptParser.parse(header);
                assert.deepEqual(actual, expected);
            });
        }

        const invalidHeaders: [string, string, string][] = [
            ["lonely type", "foo", "Unexpected end of header"],
            ["missing subtype", "foo/", "Could not find a token at pos 4"],
            ["invalid weight", "foo/bar; q=1.1", "Invalid weight: 1.1"],
            ["invalid quoted character", 'foo/bar; foo="\0"', "Unexpected character at pos 14"],
            ["invalid end after escape", 'foo/bar; foo="\\', "Unexpected end of header"],
            ["invalid escaped character", 'foo/bar; foo="\\\0"', "Unexpected character at pos 15"],
            ["unclosed quotes", 'foo/bar; foo="', "Unclosed quoted string"],
            [
                "invalid separator after type",
                "foo/bar bar",
                "Unexpected character at pos 8, expected separator",
            ],
            [
                "invalid separator after parameter name",
                "foo/bar; foo bar",
                'Unexpected character " " at pos 12, expected "="',
            ],
        ];

        for (const [name, header, expectedMessage] of invalidHeaders) {
            it(`should throw error on ${name}`, () => {
                assert.throws(
                    () => AcceptParser.parse(header),
                    new MediaTypeParserError(expectedMessage),
                );
            });
        }
    });

    describe("getAcceptableMediaTypes", () => {
        it("should return empty array for non-JSON:API media types", () => {
            const result = getAcceptableMediaTypes("application/json");
            assert.deepEqual(result, []);
        });

        it("should accept application/vnd.api+json", () => {
            const result = getAcceptableMediaTypes("application/vnd.api+json");
            assert.deepEqual(result, [{ ext: [], profile: [] }]);
        });

        it("should include ext and profile parameters", () => {
            const result = getAcceptableMediaTypes(
                'application/vnd.api+json;ext="foo bar";profile="baz qux"',
            );
            assert.deepEqual(result, [{ ext: ["foo", "bar"], profile: ["baz", "qux"] }]);
        });

        it("should skip media types with disallowed parameters", () => {
            const result = getAcceptableMediaTypes("application/vnd.api+json;charset=utf-8");
            assert.deepEqual(result, []);
        });

        it("should support wildcard type or subtype", () => {
            const result = getAcceptableMediaTypes("*/*");
            assert.deepEqual(result, [{ ext: [], profile: [] }]);
        });

        it("should support empty media type", () => {
            const result = getAcceptableMediaTypes("");
            assert.deepEqual(result, [{ ext: [], profile: [] }]);
        });

        it("should support undefined media type", () => {
            const result = getAcceptableMediaTypes(undefined);
            assert.deepEqual(result, [{ ext: [], profile: [] }]);
        });

        it("should ignore additional parameters beyond ext and profile", () => {
            const result = getAcceptableMediaTypes("application/vnd.api+json;ext=foo;bad=param");
            assert.deepEqual(result, []);
        });

        it("should throw ParserError on invalid header", () => {
            assert.throws(() => {
                getAcceptableMediaTypes("application/vnd.api+json;q=abc");
            }, /Invalid weight/);
        });
    });
});
