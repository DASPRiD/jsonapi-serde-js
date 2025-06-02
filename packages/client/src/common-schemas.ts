import type { $ZodType } from "zod/v4/core";
import { z } from "zod/v4/mini";
import type {
    Link,
    LinkObjectSchema,
    LinkSchema,
    TopLevelLinksSchema,
    UnknownMetaSchema,
} from "./common-schema-types.js";

/**
 * Schema for an open-ended meta object with string keys and unknown values
 */
export const unknownMetaSchema: UnknownMetaSchema = z.record(z.string(), z.unknown());

/**
 * Schema for a link object according to JSON:API specifications
 *
 * Supports optional metadata and link-related fields.
 */
export const linkObjectSchema: LinkObjectSchema = z.object({
    href: z.string(),
    rel: z.optional(z.string()),
    describedby: z.optional(z.url()),
    title: z.optional(z.string()),
    type: z.optional(z.string()),
    hreflang: z.optional(z.string()),
    meta: z.optional(unknownMetaSchema),
});

/**
 * Schema for a link, which can be either a string or a full link object
 */
export const linkSchema: LinkSchema = z.union([
    linkObjectSchema,
    z.string(),
]) satisfies $ZodType<Link>;

/**
 * Schema for top-level links in a JSON:API document
 *
 * Supports pagination and related resource links.
 */
export const topLevelLinksSchema: TopLevelLinksSchema = z.object({
    self: z.nullish(linkSchema),
    related: z.nullish(linkSchema),
    describedby: z.nullish(linkSchema),
    first: z.nullish(linkSchema),
    prev: z.nullish(linkSchema),
    next: z.nullish(linkSchema),
    last: z.nullish(linkSchema),
});
