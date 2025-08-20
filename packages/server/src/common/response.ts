import type { JsonApiMediaType } from "../http/index.js";
import { JsonApiError } from "./error.js";
import type { JsonApiImplementation, TopLevelMembers } from "./json-api.js";

type MediaTypeOptions = {
    extensions?: string[];
    profiles?: string[];
};

/**
 * Represents a JSON:API-compliant HTTP response document
 *
 * Encapsulates status, headers, and body generation.
 */
export class JsonApiDocument {
    private readonly members: TopLevelMembers;
    private readonly mediaTypeOptions: MediaTypeOptions | undefined;
    private readonly status: number;

    /**
     * Constructs a new JSON:API response document
     */
    public constructor(
        members: TopLevelMembers,
        status = 200,
        mediaTypeOptions?: MediaTypeOptions,
    ) {
        this.members = members;
        this.mediaTypeOptions = mediaTypeOptions;
        this.status = status;
    }

    /**
     * Returns the HTTP status code for this response
     */
    public getStatus(): number {
        return this.status;
    }

    /**
     * Returns the top-level JSON:API body object
     */
    public getBody(): TopLevelMembers & { jsonapi: JsonApiImplementation } {
        return {
            jsonapi: {
                version: "1.1",
                ext: this.mediaTypeOptions?.extensions,
                profile: this.mediaTypeOptions?.profiles,
            },
            ...this.members,
        };
    }

    /**
     * Returns the full `Content-Type` header for this response
     *
     * Automatically includes `ext` and `profile` parameters if present in `jsonapi`.
     */
    public getContentType(): string {
        const contentType = "application/vnd.api+json";
        const parameters: string[] = [];

        if (this.mediaTypeOptions?.extensions && this.mediaTypeOptions.extensions.length > 0) {
            parameters.push(`ext="${this.mediaTypeOptions.extensions.join(" ")}"`);
        }

        if (this.mediaTypeOptions?.profiles && this.mediaTypeOptions.profiles.length > 0) {
            parameters.push(`profile="${this.mediaTypeOptions.profiles.join(" ")}"`);
        }

        if (parameters.length === 0) {
            return contentType;
        }

        return `${contentType};${parameters.join(";")}`;
    }

    /**
     * Returns the media type options, if set.
     */
    public getMediaTypeOptions(): MediaTypeOptions | undefined {
        return this.mediaTypeOptions;
    }

    /**
     * Verifies that the client accepts the content type of this document
     *
     * @throws {JsonApiError} if content type is not acceptable
     */
    public verifyAcceptMediaType(acceptableTypes: JsonApiMediaType[]): void {
        const appliedExtensions = this.mediaTypeOptions?.extensions;
        const matchingTypes = acceptableTypes.filter((type) => {
            return type.ext.every((extension) => appliedExtensions?.includes(extension));
        });

        if (matchingTypes.length > 0) {
            return;
        }

        throw new JsonApiError({
            status: "406",
            code: "not_acceptable",
            title: "Not Acceptable",
            detail: "No valid accept types provided, you must accept application/vnd.api+json",
            meta: appliedExtensions ? { appliedExtensions } : undefined,
        });
    }
}
