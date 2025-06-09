import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { type ParsedSearchParams, parseSearchParams } from "../../src/http/search-params.js";

describe("http/search-params", () => {
    type TestCase = {
        name: string;
        input: string;
        expected: ParsedSearchParams;
    };

    const testCases: TestCase[] = [
        {
            name: "parse flat key=value pairs",
            input: "foo=bar&baz=qux",
            expected: { foo: "bar", baz: "qux" },
        },
        {
            name: "parse nested object",
            input: "foo[bar]=baz&foo[qux]=quux",
            expected: { foo: { bar: "baz", qux: "quux" } },
        },
        {
            name: "parse array with empty brackets",
            input: "foo[]=1&foo[]=2",
            expected: { foo: ["1", "2"] },
        },
        {
            name: "parse array with numeric indexes",
            input: "foo[0]=zero&foo[1]=one",
            expected: { foo: ["zero", "one"] },
        },
        {
            name: "parse mixed array push and index",
            input: "foo[]=zero&foo[1]=one",
            expected: { foo: ["zero", "one"] },
        },
        {
            name: "parse nested object in array",
            input: "foo[0][bar]=baz",
            expected: { foo: [{ bar: "baz" }] },
        },
        {
            name: "parse array inside nested object in array",
            input: "foo[0][bar][]=1&foo[0][bar][]=2",
            expected: { foo: [{ bar: ["1", "2"] }] },
        },
        {
            name: "promote string to object",
            input: "foo=bar&foo[baz]=qux",
            expected: { foo: { baz: "qux" } },
        },
        {
            name: "promote string to array",
            input: "foo=bar&foo[]=baz",
            expected: { foo: ["baz"] },
        },
        {
            name: "promote array to object",
            input: "foo[]=a&foo[bar]=b",
            expected: { foo: { 0: "a", bar: "b" } },
        },
        {
            name: "keep object when receiving array",
            input: "foo[bar]=a&foo[]=b",
            expected: { foo: { bar: "a", "": "b" } },
        },
        {
            name: "parse deep nested structures",
            input: "a[b][c][d][]=1&a[b][c][d][]=2",
            expected: { a: { b: { c: { d: ["1", "2"] } } } },
        },
        {
            name: "ignore malformed keys",
            input: "foo[bar]baz[bat]=nope&valid[key]=ok",
            expected: { valid: { key: "ok" } },
        },
        {
            name: "preserve numeric keys in object",
            input: "foo[1]=bar&foo[a]=baz",
            expected: { foo: { 1: "bar", a: "baz" } },
        },
        {
            name: "handle index gaps in arrays",
            input: "foo[0]=a&foo[2]=c",
            expected: { foo: ["a", "c"] },
        },
        {
            name: "handle conflict: object then string (string wins)",
            input: "foo[bar]=baz&foo=string",
            expected: { foo: "string" },
        },
        {
            name: "handle conflict: string then object (object wins)",
            input: "foo=string&foo[bar]=baz",
            expected: { foo: { bar: "baz" } },
        },
        {
            name: "handle conflict: array then string (string wins)",
            input: "foo[]=1&foo=string",
            expected: { foo: "string" },
        },
        {
            name: "handle conflict: string then array (array wins)",
            input: "foo=string&foo[]=1",
            expected: { foo: ["1"] },
        },
        {
            name: "prevent prototype pollution",
            input: "__proto__=foo&foo[prototype]=bar&bar[][constructor]=baz",
            expected: { bar: [{}], foo: {} },
        },
    ];

    for (const { name, input, expected } of testCases) {
        it(`should ${name}`, () => {
            const result = parseSearchParams(input);
            assert.deepEqual(result, expected);
        });
    }
});
