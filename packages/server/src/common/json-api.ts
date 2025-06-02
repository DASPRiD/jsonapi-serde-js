/** Arbitrary metadata object allowed anywhere in a JSON:API document */
export type Meta = Record<string, unknown>;

/** A link object with optional attributes for rich linking information */
export type LinkObject = {
    href: string;
    rel?: string;
    describedby?: string;
    title?: string;
    type?: string;
    hreflang?: string;
    meta?: Meta;
};

/** A link can be a plain string URL or a full `LinkObject` */
export type Link = LinkObject | string;

/** A collection of named links. Keys are optional and can be nullified */
export type Links<TKey extends string = string> = Partial<Record<TKey, Link | null>>;

/** Standard top-level links as defined by JSON:API */
export type TopLevelLinks = Links<
    "self" | "related" | "describedby" | "first" | "last" | "prev" | "next"
>;

/** A JSON:API-compliant error object */
export type JsonApiErrorObject = {
    id?: string;
    links?: Links<"about" | "type">;
    status?: string;
    code?: string;
    title?: string;
    detail?: string;
    source?: {
        pointer?: string;
        parameter?: string;
        header?: string;
    };
    meta?: Meta;
};

export type JsonApiImplementation = {
    version?: string;
    ext?: string[];
    profile?: string[];
    meta?: Meta;
};

/** Optional fields allowed at the top level of a JSON:API document */
type OptionalTopLevelMembers = {
    links?: TopLevelLinks;
    included?: Resource[];
};

/** A data document contains a primary resource (`data`) and may include `meta` */
type DataTopLevelMembers = {
    data: Resource | Resource[] | null;
    errors?: undefined;
    meta?: Meta;
};

/** An error document includes one or more errors, but no primary data */
type ErrorTopLevelMembers = {
    data?: undefined;
    errors: JsonApiErrorObject[];
    meta?: Meta;
};

/** A meta-only document contains only `meta`, no data or errors */
type MetaTopLevelMembers = {
    data?: undefined;
    errors?: undefined;
    meta: Meta;
};

/**
 * The top-level members of a JSON:API document
 *
 * One of `data`, `errors`, or `meta` must be present.
 */
export type TopLevelMembers = OptionalTopLevelMembers &
    (DataTopLevelMembers | ErrorTopLevelMembers | MetaTopLevelMembers);

/** Resource attributes are key-value pairs */
export type Attributes = Record<string, unknown>;

/** A map of relationship names to their definitions */
export type Relationships = Record<string, Relationship>;

/** A reference to another resource */
export type ResourceIdentifier = {
    type: string;
    id: string;
    meta?: Meta;
};

/** A relationship describes links and/or resource identifiers */
export type Relationship = {
    data?: ResourceIdentifier | ResourceIdentifier[] | null;
    links?: Links<"self" | "related" | string>;
    meta?: Meta;
};

/** A full resource object in the JSON:API format */
export type Resource = {
    id: string;
    type: string;
    attributes?: Partial<Attributes>;
    relationships?: Partial<Relationships>;
    links?: Links<"self" | string>;
    meta?: Meta;
};
