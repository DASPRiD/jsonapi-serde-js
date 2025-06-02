import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { type TopLevelLinks, extractPageParams, injectPageParams } from "../src/index.js";

describe("pagination", () => {
    describe("extractPageParams", () => {
        it("extracts all pagination links with parameters", () => {
            const links: TopLevelLinks = {
                first: "http://localhost/api/users?page[number]=1&page[size]=10",
                prev: "http://localhost/api/users?page[number]=2&page[size]=10",
                next: "http://localhost/api/users?page[number]=4&page[size]=10",
                last: "http://localhost/api/users?page[number]=10&page[size]=10",
            };

            const pageParams = extractPageParams(links);

            assert.deepEqual(pageParams.first, { number: "1", size: "10" });
            assert.deepEqual(pageParams.prev, { number: "2", size: "10" });
            assert.deepEqual(pageParams.next, { number: "4", size: "10" });
            assert.deepEqual(pageParams.last, { number: "10", size: "10" });
        });

        it("throws if expected param is missing", () => {
            const links: TopLevelLinks = {
                first: "http://localhost/api/users?page[number]=1",
            };

            assert.throws(() => {
                extractPageParams(links, ["number", "size"]);
            }, /Page params 'size' is missing/);
        });

        it("throws if no page params are found", () => {
            const links: TopLevelLinks = {
                first: "http://localhost/api/users?offset=30&limit=10",
            };

            assert.throws(() => {
                extractPageParams(links);
            }, /No page params found/);
        });

        it("returns undefined for missing links", () => {
            const links: TopLevelLinks = {
                first: undefined,
                prev: null,
                next: undefined,
                last: undefined,
            };

            const result = extractPageParams(links);
            assert.deepEqual(result, {
                first: undefined,
                prev: undefined,
                next: undefined,
                last: undefined,
            });
        });

        it("respects expectedParams", () => {
            const links: TopLevelLinks = {
                next: "http://localhost/api/users?page[offset]=40&page[limit]=20",
            };

            const result = extractPageParams(links, ["offset", "limit"]);
            assert.deepEqual(result.next, { offset: "40", limit: "20" });
        });

        it("accepts link object", () => {
            const links: TopLevelLinks = {
                next: { href: "http://localhost/api/users?page[number]=1&page[size]=10" },
            };

            const result = extractPageParams(links);
            assert.deepEqual(result.next, { number: "1", size: "10" });
        });
    });

    describe("injectPageParams", () => {
        it("injects page params into the URL", () => {
            const url = new URL("http://localhost/api/users");

            injectPageParams(url, { number: "3", size: "20" });

            assert.equal(
                url.toString(),
                "http://localhost/api/users?page%5Bnumber%5D=3&page%5Bsize%5D=20",
            );
        });

        it("does nothing when pageParams is null or undefined", () => {
            const url1 = new URL("http://localhost/api/users");
            injectPageParams(url1, null);
            assert.equal(url1.toString(), "http://localhost/api/users");

            const url2 = new URL("http://localhost/api/users");
            injectPageParams(url2, undefined);
            assert.equal(url2.toString(), "http://localhost/api/users");
        });
    });
});
