import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
    ContentTypeParser,
    MediaTypeParserError,
    type ParsedContentType,
} from "../../src/http/index.js";

describe("http/content-type", () => {
    describe("ContentTypeParser", () => {
        const validHeaders: [string, string, ParsedContentType][] = [
            [
                "simple type",
                "application/json",
                {
                    type: "application",
                    subType: "json",
                    parameters: {},
                },
            ],
            [
                "type with parameter",
                "application/json ; foo=bar",
                {
                    type: "application",
                    subType: "json",
                    parameters: { foo: "bar" },
                },
            ],
            [
                "type with multiple parameters",
                "application/json ; foo=bar;baz=bat",
                {
                    type: "application",
                    subType: "json",
                    parameters: { foo: "bar", baz: "bat" },
                },
            ],
            [
                "type with quoted parameter",
                'application/json ; foo="bar\\",;baz"',
                {
                    type: "application",
                    subType: "json",
                    parameters: { foo: 'bar",;baz' },
                },
            ],
        ];

        for (const [name, header, expected] of validHeaders) {
            it(`should match ${name}`, () => {
                const actual = ContentTypeParser.parse(header);
                assert.deepEqual(actual, expected);
            });
        }

        const invalidHeaders: [string, string, string][] = [
            ["lonely type", "foo", "Unexpected end of header"],
            ["missing subtype", "foo/", "Could not find a token at pos 4"],
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
                    () => ContentTypeParser.parse(header),
                    new MediaTypeParserError(expectedMessage),
                );
            });
        }
    });
});
