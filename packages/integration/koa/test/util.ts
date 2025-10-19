import type { ParameterizedContext as KoaContext, Request, Response } from "koa";

type KoaMockContextOptions<TState> = {
    state?: TState;
    request?: {
        body?: unknown;
        headers?: Record<string, string>;
    };
    response?: {
        headers?: Record<string, string | string[]>;
    };
};

type BodyParserKoaContext<TState> = KoaContext<Partial<TState>> & {
    request: KoaContext<Partial<TState>>["request"] & {
        body?: unknown;
    };
};

/* node:coverage disable */
export const createKoaMockContext = <TState>(
    options?: KoaMockContextOptions<TState>,
): BodyParserKoaContext<Partial<TState>> => {
    const requestHeaders = Object.fromEntries(
        Object.entries(options?.request?.headers ?? {}).map(([key, value]) => [
            key.toLowerCase(),
            value,
        ]),
    );

    const context: Pick<
        BodyParserKoaContext<Partial<TState>>,
        "state" | "get" | "set" | "remove" | "request" | "response" | "status" | "body"
    > = {
        state: options?.state ?? {},
        get: (field: string): string => requestHeaders[field.toLowerCase()] ?? "",
        set: (field: string | Record<string, string | string[]>, value?: string | string[]) => {
            if (typeof field === "string") {
                context.response.headers[field.toLowerCase()] = value;
            }
        },
        remove: (field: string) => {
            context.response.headers[field.toLowerCase()] = undefined;
        },
        request: {
            body: options?.request?.body,
        } as unknown as Request,
        response: {
            headers: options?.response?.headers ?? {},
        } as Response,
        status: 0,
        body: "",
    };

    return context as BodyParserKoaContext<Partial<TState>>;
};
/* node:coverage enable */
