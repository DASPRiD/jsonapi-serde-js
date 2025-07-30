/**
 * Matches the full key with optional bracketed subkeys (e.g., "user[address][city]")
 */
const fullKeyRegex = /^([^[\]]+)((?:\[[^[\]]*])*)$/;

/**
 * Matches each bracketed section inside a key (e.g., "[address]", "[city]")
 */
const bracketsRegex = /\[([^[\]]*)]/g;

/**
 * Matches numeric array indices (e.g., "0", "1")
 */
const indexRegex = /^\d+$/;

/**
 * Represents a nested object in parsed search params
 */
type ParsedSearchParamsObject = {
    [k: string]: ParsedSearchParamsObject | ParsedSearchParamsArray | string;
};

/**
 * Represents an array in parsed search params
 */
type ParsedSearchParamsArray = (ParsedSearchParamsObject | ParsedSearchParamsArray | string)[];

/**
 * Root type representing the fully parsed search parameters
 */
export type ParsedSearchParams = ParsedSearchParamsObject;

/**
 * Parses a query string key into a path array
 */
const parseKey = (key: string): string[] | null => {
    const match = fullKeyRegex.exec(key);

    if (!match) {
        return null;
    }

    const path = [match[1]];
    const brackets = match[2];
    path.push(...Array.from(brackets.matchAll(bracketsRegex), (match) => match[1]));

    return path;
};

/**
 * Recursively removes undefined entries and empty holes from arrays
 */
const filterEmptyItems = <T extends ParsedSearchParamsObject | ParsedSearchParamsArray>(
    current: T,
): NoInfer<T> => {
    if (Array.isArray(current)) {
        return current
            .filter((value) => value !== undefined)
            .map((value) => {
                if (typeof value === "string") {
                    return value;
                }

                return filterEmptyItems(value);
            }) as T;
    }

    return Object.fromEntries(
        Object.entries(current).map(([key, value]) => {
            if (typeof value === "string") {
                return [key, value];
            }

            return [key, filterEmptyItems(value)];
        }),
    );
};

type Indexable = Record<
    string | number,
    ParsedSearchParamsObject | ParsedSearchParamsArray | string
>;

/**
 * Input type accepted by `URLSearchParams`, such as string, object, or iterable
 */
export type SearchParamsInput = ConstructorParameters<typeof URLSearchParams>[0];

/**
 * Parses a URL query string or `URLSearchParams` input into a deeply nested object
 *
 * Supports bracket and array notation like `user[address][city]=NY`.
 *
 * Any key parts named `__proto__`, `constructor` or `prototype` are skipped to prevent prototype pollution.
 *
 * @example
 * ```ts
 * parseSearchParams("foo[0]=bar&foo[1]=baz");
 * // => { foo: ["bar", "baz"] }
 * ```
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Kept within one function for performance reasons
export const parseSearchParams = (input: SearchParamsInput): ParsedSearchParams => {
    const searchParams = new URLSearchParams(input);
    const result: ParsedSearchParams = Object.create(null);

    for (const [key, value] of searchParams) {
        const path = parseKey(key);

        if (!path) {
            continue;
        }

        let previous: ParsedSearchParamsObject | ParsedSearchParamsArray | null = null;
        let keyInPrevious: string | number | null = null;
        let current: Indexable = result;

        for (let i = 0; i < path.length; ++i) {
            const part = path[i];
            const isLast = i === path.length - 1;
            const isIndex = indexRegex.test(part);

            if (Array.isArray(current) && !isIndex && part !== "") {
                current = Object.fromEntries(
                    [...current.entries()].filter(([_, value]) => value !== undefined),
                ) as ParsedSearchParamsObject;

                if (previous && keyInPrevious !== null) {
                    previous[keyInPrevious] = current;
                }
            }

            const key: string | number =
                Array.isArray(current) && isIndex
                    ? Number.parseInt(part, 10)
                    : Array.isArray(current) && part === ""
                      ? current.length
                      : part;

            if (key === "__proto__" || key === "constructor" || key === "prototype") {
                // Skip unsafe keys to prevent prototype pollution
                continue;
            }

            if (isLast) {
                current[key] = value;
                continue;
            }

            previous = current;
            keyInPrevious = key;

            if (!current[key] || typeof current[key] === "string") {
                const next = path[i + 1];
                current[key] = next === "" || indexRegex.test(next) ? [] : {};
            }

            current = current[key] as Indexable;
        }
    }

    return filterEmptyItems(result);
};
