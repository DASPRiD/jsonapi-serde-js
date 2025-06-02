import { MediaTypeParser, MediaTypeParserError } from "./media-type-parser.js";

export type ParsedContentType = {
    type: string;
    subType: string;
    parameters: Record<string, string>;
};

/**
 * Parses and represents an HTTP `Content-Type` header as structured data
 */
export class ContentTypeParser extends MediaTypeParser {
    /**
     * Parses the Content-Type header string into a structured `ParsedContentType` object
     *
     * @throws {ParserError} when parsing of Content-Type header fails
     */
    public static parse(header: string): ParsedContentType {
        const parser = new ContentTypeParser(header);
        return parser.process();
    }

    private process(): ParsedContentType {
        this.skipWhitespace();
        const type = this.readToken().toLowerCase();
        this.consumeChar("/");
        const subType = this.readToken().toLowerCase();

        const parameters: Record<string, string> = {};
        this.skipWhitespace();

        if (this.index === this.length) {
            return { type, subType, parameters };
        }

        if (this.header[this.index] !== ";") {
            throw new MediaTypeParserError(
                `Unexpected character at pos ${this.index}, expected separator`,
            );
        }

        this.index += 1;

        if (this.index < this.length) {
            for (const [name, value] of this.readParameters(false)) {
                parameters[name] = value;
            }
        }

        return { type, subType, parameters };
    }
}
