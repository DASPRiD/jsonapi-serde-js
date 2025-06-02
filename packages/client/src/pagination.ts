import type { Link, TopLevelLinks } from "./common-schema-types.js";

/**
 * A mapping of expected page parameter names to their string values
 */
export type PageParams<TExpectedParams extends string = string> = {
    [K in TExpectedParams]: string;
};

/**
 * A set of optional pagination-related links and their corresponding page parameters
 */
export type PaginationPageParams<TExpectedParams extends string> = {
    first?: PageParams<TExpectedParams>;
    prev?: PageParams<TExpectedParams>;
    next?: PageParams<TExpectedParams>;
    last?: PageParams<TExpectedParams>;
};

type ExtractParams<T> = T extends readonly (infer U)[] ? U : string;

/**
 * Extracts page parameters from top-level pagination links
 *
 * @throws {Error} if any expected page parameters are missing or no page parameters are found in a link
 */
export const extractPageParams = <TExpectedParams extends readonly string[] | undefined>(
    links: TopLevelLinks,
    expectedParams?: TExpectedParams,
): PaginationPageParams<ExtractParams<TExpectedParams>> => {
    return {
        first: parsePageParamsFromLink(links.first, expectedParams),
        prev: parsePageParamsFromLink(links.prev, expectedParams),
        next: parsePageParamsFromLink(links.next, expectedParams),
        last: parsePageParamsFromLink(links.last, expectedParams),
    };
};

const pageParamRegexp = /^page\[([a-zA-Z0-9]+)]$/;

/**
 * Parses the page parameters from a single link
 *
 * @throws {Error} if no page parameters are found in the link
 * @throws {Error} if any expected parameter is missing from the link
 */
const parsePageParamsFromLink = <TExpectedParams extends readonly string[] | undefined>(
    link: Link | undefined | null,
    expectedParams?: TExpectedParams,
): PageParams<ExtractParams<TExpectedParams>> | undefined => {
    if (link === undefined || link === null) {
        return undefined;
    }

    const url = new URL(typeof link === "string" ? link : link.href, "http://localhost");
    const pageParams: PageParams = {};

    for (const [key, value] of url.searchParams.entries()) {
        const match = pageParamRegexp.exec(key);

        if (match) {
            pageParams[match[1]] = value;
        }
    }

    if (Object.keys(pageParams).length === 0) {
        throw new Error(`No page params found in link ${url.toString()}`);
    }

    if (!expectedParams) {
        return pageParams as PageParams<ExtractParams<TExpectedParams>>;
    }

    for (const expectedParam of expectedParams) {
        if (!(expectedParam in pageParams)) {
            throw new Error(`Page params '${expectedParam}' is missing in link ${url.toString()}`);
        }
    }

    return pageParams as PageParams<ExtractParams<TExpectedParams>>;
};

/**
 * Injects page parameters into a URL as query parameters
 */
export const injectPageParams = (
    url: URL,
    pageParams: PageParams<string> | null | undefined,
): void => {
    if (!pageParams) {
        return;
    }

    for (const [key, value] of Object.entries(pageParams)) {
        url.searchParams.set(`page[${key}]`, value);
    }
};
