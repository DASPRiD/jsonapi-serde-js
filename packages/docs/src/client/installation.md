# Installation

The client package provides tools to **deserialize** [JSON:API 1.1](https://jsonapi.org/format/1.1/) documents and 
**handle errors** in a type-safe way.

## Install via package manager

::: code-group

```sh [npm]
$ npm add @jsonapi-serde/client zod
```

```sh [pnpm]
$ pnpm add @jsonapi-serde/client zod
```

```sh [yarn]
$ yarn add @jsonapi-serde/client zod
```

```sh [bun]
$ bun add @jsonapi-serde/client zod
```

:::

::: tip NOTE

This package uses Zod v4 under the hood for runtime validation, so it must be installed as a peer dependency.

:::

## Requirements

- Modern browser or [Node.js](https://nodejs.org/) version 18 or higher (for native `URL` and `fetch`)
- [TypeScript](https://www.typescriptlang.org/) version 5 or higher

## What You Get

- Deserialization of `data`, `included`, `meta`, `links`, and `relationships`
- Automatically **flattens resources and relationships** into easy-to-use objects, removing nesting complexity
- Deeply nested relationship resolution
- Built-in error handling and JSON:API error types
- Pagination helpers (parse/inject `page[limit]`, `page[offset]`, etc.)
- Full type safety with Zod schemas
