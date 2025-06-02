/**
 * Thrown when parsing the Accept header fails due to invalid syntax or unexpected characters
 */
export class ParserError extends Error {}

/**
 * Parsed representation of a single media type in the Accept header
 */
export type AcceptMediaType = {
    type: string;
    subType: string;
    parameters: Record<string, string>;
    weight: number;
    acceptExt: Record<string, string>;
};

/**
 * List of all parsed media types sorted by descending quality (`q`) weight
 */
export type Accept = AcceptMediaType[];

/**
 * Returns a string of ASCII characters in a given range
 */
const asciiRange = (start: number, end: number): string => {
    let chars = "";

    for (let ascii = start; ascii <= end; ++ascii) {
        chars += String.fromCharCode(ascii);
    }

    return chars;
};

// Definitions from RFCs used in parsing tokens and quoted strings.
const DIGIT = asciiRange(0x30, 0x39);
const ALPHA = asciiRange(0x41, 0x5a) + asciiRange(0x61, 0x7a);
const VCHAR = asciiRange(0x21, 0x7e);
const TCHAR = `!#$%&'*+-.^_\`|~${DIGIT}${ALPHA}`;
const OBS_TEXT = asciiRange(0x80, 0xff);
const QD_TEXT = `\t !${asciiRange(0x23, 0x5b)}${asciiRange(0x50, 0x7e)}${OBS_TEXT}`;
const QCHAR = `\t ${VCHAR} ${OBS_TEXT}`;

type RawParameter = [string, string];

/**
 * Parses and represents an HTTP `Accept` header as structured data
 */
export class AcceptParser {
    private static readonly default: AcceptMediaType = {
        type: "*",
        subType: "*",
        parameters: {},
        weight: 1,
        acceptExt: {},
    };
    private static readonly weightRegexp = /^(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/;

    private index = 0;
    private readonly length: number;

    private constructor(private readonly header: string) {
        this.length = header.length;
    }

    /**
     * Parses the header into an ordered list of media types
     */
    private process(): Accept {
        this.skipWhitespace();

        if (this.index === this.length) {
            return [AcceptParser.default];
        }

        const accept: Accept = [];
        let mediaType: AcceptMediaType;
        let hasMore: boolean;

        do {
            [mediaType, hasMore] = this.readMediaType();
            accept.push(mediaType);
        } while (hasMore);

        accept.sort((a, b) => b.weight - a.weight);
        return accept;
    }

    private readMediaType(): [AcceptMediaType, boolean] {
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

        for (const [name, value] of this.readParameters()) {
            if (name === "q") {
                parameterTarget = acceptExt;

                if (!AcceptParser.weightRegexp.test(value)) {
                    throw new ParserError(`Invalid weight: ${value}`);
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

    private readParameters(): RawParameter[] {
        const parameters: RawParameter[] = [];

        while (this.index < this.length) {
            this.skipWhitespace();
            parameters.push(this.readParameter());
            this.skipWhitespace();

            if (this.index === this.length || this.header[this.index] === ",") {
                break;
            }

            this.consumeChar(";");
        }

        return parameters;
    }

    private readParameter(): RawParameter {
        this.skipWhitespace();

        const parameterName = this.readToken();
        this.consumeChar("=");
        const parameterValue = this.readParameterValue();

        return [parameterName, parameterValue];
    }

    private readParameterValue(): string {
        if (this.header[this.index] === '"') {
            return this.readQuotedString();
        }

        return this.readToken();
    }

    private readQuotedString(): string {
        this.consumeChar('"');

        let result = "";
        let endFound = false;

        while (this.index < this.length) {
            const char = this.header[this.index];
            this.index += 1;

            if (char === '"') {
                endFound = true;
                break;
            }

            if (char !== "\\") {
                if (!QD_TEXT.includes(char)) {
                    throw new ParserError(`Unexpected character at pos ${this.index - 1}`);
                }

                result += char;
                continue;
            }

            if (this.index === this.length) {
                throw new ParserError("Unexpected end of header");
            }

            const quotedChar = this.header[this.index];
            this.index += 1;

            if (!QCHAR.includes(quotedChar)) {
                throw new ParserError(`Unexpected character at pos ${this.index - 1}`);
            }

            result += quotedChar;
        }

        if (!endFound) {
            throw new ParserError("Unclosed quoted string");
        }

        return result;
    }

    private skipWhitespace() {
        while (
            this.index < this.length &&
            (this.header[this.index] === " " || this.header[this.index] === "\t")
        ) {
            this.index += 1;
        }
    }

    private consumeChar(char: string) {
        if (this.index === this.length) {
            throw new ParserError("Unexpected end of header");
        }

        if (this.header[this.index] !== char) {
            throw new ParserError(
                `Unexpected character "${this.header[this.index]}" at pos ${
                    this.index
                }, expected "${char}"`,
            );
        }

        this.index += 1;
    }

    private readSeparator(): string {
        // No need for an index check here, as the caller already took care of it.
        const char = this.header[this.index];
        this.index += 1;

        if (char !== "," && char !== ";") {
            throw new ParserError(
                `Unexpected character at pos ${this.index - 1}, expected separator`,
            );
        }

        return char;
    }

    private readToken(): string {
        let token = "";

        while (this.index < this.length && TCHAR.includes(this.header[this.index])) {
            token += this.header[this.index];
            this.index += 1;
        }

        if (token.length === 0) {
            throw new ParserError(`Could not find a token at pos ${this.index}`);
        }

        return token;
    }

    /**
     * Parses the Accept header string into a structured `Accept` array
     *
     * @throws {ParserError} when parsing of Accept header fails
     */
    public static parse(header: string): Accept {
        const parser = new AcceptParser(header);
        return parser.process();
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
 * Filters and extracts valid JSON:API media types from an Accept header
 *
 * Only includes entries with:
 *
 * - `type` of `application` or `*`
 * - `subType` of `vnd.api+json` or `*`
 * - No extra parameters beyond `ext` and `profile`
 *
 * @throws {ParserError} when parsing of Accept header fails
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
