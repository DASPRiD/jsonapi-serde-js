import type { $ZodType } from "zod/v4/core";

export type UnknownMeta = { [k: string]: unknown };
export type UnknownMetaSchema = $ZodType<UnknownMeta>;

export type LinkObject = {
    href: string;
    rel?: string;
    describedby?: string;
    title?: string;
    type?: string;
    hreflang?: string;
    meta?: UnknownMeta;
};
export type LinkObjectSchema = $ZodType<LinkObject>;
export type Link = LinkObject | string;
export type LinkSchema = $ZodType<Link>;
export type Links<T extends string = string> = { [K in T]?: Link | null };
export type LinksSchema = $ZodType<Links>;
export type TopLevelLinks = Links<
    "self" | "related" | "describedby" | "first" | "prev" | "next" | "last"
>;
export type TopLevelLinksSchema = $ZodType<TopLevelLinks>;
