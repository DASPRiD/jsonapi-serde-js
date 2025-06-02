/**
 * Thrown when parsing the header fails due to invalid syntax or unexpected characters
 */
export class MediaTypeParserError extends Error {}

/**
 * Parsed representation of a single media type
 */
export type MediaType = {
    type: string;
    subType: string;
    parameters: Record<string, string>;
    weight: number;
    acceptExt: Record<string, string>;
};

/**
 * List of all parsed media types sorted by descending quality (`q`) weight
 */
export type Accept = MediaType[];

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

export abstract class MediaTypeParser {
    protected readonly header: string;
    protected readonly length: number;
    protected index = 0;

    protected constructor(header: string) {
        this.header = header;
        this.length = header.length;
    }

    protected readParameters(allowMediaTypeSeparator: boolean): RawParameter[] {
        const parameters: RawParameter[] = [];

        while (this.index < this.length) {
            this.skipWhitespace();
            parameters.push(this.readParameter());
            this.skipWhitespace();

            if (
                this.index === this.length ||
                (allowMediaTypeSeparator && this.header[this.index] === ",")
            ) {
                break;
            }

            this.consumeChar(";");
        }

        return parameters;
    }

    protected readParameter(): RawParameter {
        this.skipWhitespace();

        const parameterName = this.readToken();
        this.consumeChar("=");
        const parameterValue = this.readParameterValue();

        return [parameterName, parameterValue];
    }

    protected readParameterValue(): string {
        if (this.header[this.index] === '"') {
            return this.readQuotedString();
        }

        return this.readToken();
    }

    protected readQuotedString(): string {
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
                    throw new MediaTypeParserError(`Unexpected character at pos ${this.index - 1}`);
                }

                result += char;
                continue;
            }

            if (this.index === this.length) {
                throw new MediaTypeParserError("Unexpected end of header");
            }

            const quotedChar = this.header[this.index];
            this.index += 1;

            if (!QCHAR.includes(quotedChar)) {
                throw new MediaTypeParserError(`Unexpected character at pos ${this.index - 1}`);
            }

            result += quotedChar;
        }

        if (!endFound) {
            throw new MediaTypeParserError("Unclosed quoted string");
        }

        return result;
    }

    protected skipWhitespace() {
        while (
            this.index < this.length &&
            (this.header[this.index] === " " || this.header[this.index] === "\t")
        ) {
            this.index += 1;
        }
    }

    protected consumeChar(char: string) {
        if (this.index === this.length) {
            throw new MediaTypeParserError("Unexpected end of header");
        }

        if (this.header[this.index] !== char) {
            throw new MediaTypeParserError(
                `Unexpected character "${this.header[this.index]}" at pos ${
                    this.index
                }, expected "${char}"`,
            );
        }

        this.index += 1;
    }

    protected readToken(): string {
        let token = "";

        while (this.index < this.length && TCHAR.includes(this.header[this.index])) {
            token += this.header[this.index];
            this.index += 1;
        }

        if (token.length === 0) {
            throw new MediaTypeParserError(`Could not find a token at pos ${this.index}`);
        }

        return token;
    }
}
