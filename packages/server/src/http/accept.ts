import { MediaTypeParser, MediaTypeParserError } from "./media-type-parser.js";

/**
 * Parsed representation of a single media type in the Accept header
 */
export type ParsedAcceptMediaType = {
    type: string;
    subType: string;
    parameters: Record<string, string>;
    weight: number;
    acceptExt: Record<string, string>;
};

/**
 * List of all parsed media types sorted by descending quality (`q`) weight
 */
export type ParsedAccept = ParsedAcceptMediaType[];

/**
 * Parses and represents an HTTP `Accept` header as structured data
 */
export class AcceptParser extends MediaTypeParser {
    private static readonly default: ParsedAcceptMediaType = {
        type: "*",
        subType: "*",
        parameters: {},
        weight: 1,
        acceptExt: {},
    };
    private static readonly weightRegexp = /^(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/;

    /**
     * Parses the Accept header string into a structured `ParsedAccept` array
     *
     * @throws {MediaTypeParserError} when parsing of Accept header fails
     */
    public static parse(header: string): ParsedAccept {
        const parser = new AcceptParser(header);
        return parser.process();
    }

    /**
     * Parses the header into an ordered list of media types
     */
    private process(): ParsedAccept {
        this.skipWhitespace();

        if (this.index === this.length) {
            return [AcceptParser.default];
        }

        const accept: ParsedAccept = [];
        let mediaType: ParsedAcceptMediaType;
        let hasMore: boolean;

        do {
            [mediaType, hasMore] = this.readMediaType();
            accept.push(mediaType);
        } while (hasMore);

        accept.sort((a, b) => b.weight - a.weight);
        return accept;
    }

    private readMediaType(): [ParsedAcceptMediaType, boolean] {
        const type = this.readToken().toLowerCase();
        this.consumeChar("/");
        const subType = this.readToken().toLowerCase();
        this.skipWhitespace();

        if (this.index === this.length) {
            return [{ ...AcceptParser.default, type, subType }, false];
        }

        if (this.readSeparator() === ",") {
            this.skipWhitespace();
            return [{ ...AcceptParser.default, type, subType }, true];
        }

        const parameters: Record<string, string> = {};
        let weight = 1;
        const acceptExt: Record<string, string> = {};
        let parameterTarget = parameters;

        for (const [name, value] of this.readParameters(true)) {
            if (name === "q") {
                parameterTarget = acceptExt;

                if (!AcceptParser.weightRegexp.test(value)) {
                    throw new MediaTypeParserError(`Invalid weight: ${value}`);
                }

                weight = Number.parseFloat(value);
                continue;
            }

            parameterTarget[name] = value;
        }

        this.skipWhitespace();
        const hasMore = this.index < this.length;

        if (hasMore) {
            this.consumeChar(",");
            this.skipWhitespace();
        }

        return [{ type, subType, parameters, weight, acceptExt }, hasMore];
    }

    private readSeparator(): string {
        // No need for an index check here, as the caller already took care of it.
        const char = this.header[this.index];
        this.index += 1;

        if (char !== "," && char !== ";") {
            throw new MediaTypeParserError(
                `Unexpected character at pos ${this.index - 1}, expected separator`,
            );
        }

        return char;
    }
}

/**
 * Represents a parsed and filtered JSON:API media type with `ext` and `profile` parameters
 */
export type JsonApiMediaType = {
    ext: string[];
    profile: string[];
};

/**
 * Filters and extracts valid JSON:API media types from an `Accept` header
 *
 * Only includes entries with:
 *
 * - `type` of `application` or `*`
 * - `subType` of `vnd.api+json` or `*`
 * - No extra parameters beyond `ext` and `profile`
 *
 * @throws {MediaTypeParserError} when parsing of Accept header fails
 */
export const getAcceptableMediaTypes = (header: string | undefined): JsonApiMediaType[] => {
    const accept = AcceptParser.parse(header ?? "");

    return accept.reduce<JsonApiMediaType[]>((accept, mediaType) => {
        if (
            (mediaType.type !== "*" && mediaType.type !== "application") ||
            (mediaType.subType !== "*" && mediaType.subType !== "vnd.api+json")
        ) {
            return accept;
        }

        const { ext, profile, ...rest } = mediaType.parameters;

        if (Object.keys(rest).length !== 0) {
            return accept;
        }

        accept.push({
            ext: ext ? ext.split(" ") : [],
            profile: profile ? profile.split(" ") : [],
        });
        return accept;
    }, []);
};
