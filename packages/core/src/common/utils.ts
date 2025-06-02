export type Identity<T> = T;
export type Flatten<T> = Identity<{
    [K in keyof T]: T[K];
}>;

export type ParentPaths<T extends string> = T extends `${infer Head}.${infer Tail}`
    ? Head | `${Head}.${ParentPaths<Tail>}`
    : T;
