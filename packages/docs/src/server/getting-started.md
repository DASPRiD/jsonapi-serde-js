# Getting Started

## Why use this library?

Working with the [JSON:API](https://jsonapi.org) specification can be tedious and error-prone, especially when building
consistent and reusable serialization logic across a complex application.

`@jsonapi-serde/server` solves this by providing:

- ✅ **Type-safe serialization** – Define how your entities map to JSON:API resource objects with full TypeScript
  support.
- 🔁 **Composable and fluent API** – Add serializers using a chainable builder, then generate a single `serialize()`
  function.
- 🔍 **Fine-grained control** – Handle sparse fieldsets, compound documents (`included`), links, meta, and more with
  ease.
- 🧩 **Framework-agnostic design** – Integrates with any HTTP framework. Helpers and adapters are available for
  supported frameworks.
- 📦 **Small and focused** – The server package is minimal, focused only on serialization, and can be extended as
  needed.

Whether you're exposing a REST API or transforming internal data structures into JSON:API documents, this library gives
you the flexibility and structure you need — without getting in your way.

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) version 20 or higher.
- [TypeScript](https://www.typescriptlang.org/) version 5 or higher, though you could use this library with pure
  JavaScript (not recommended).
- ESM-only (no CommonJS support)

::: code-group

```sh [npm]
$ npm add @jsonapi-serde/server zod
```

```sh [pnpm]
$ pnpm add @jsonapi-serde/server zod
```

```sh [yarn]
$ yarn add @jsonapi-serde/server zod
```

```sh [bun]
$ bun add @jsonapi-serde/server zod
```

:::

::: tip NOTE

JSON:API serde is an ESM-only project. Don't use `require()` to import it, and make sure your nearest `package.json`
contains `"type": "module"`, or change the file extension of your relevant files to `.mjs`/`.mts`.

:::

## What's included?

The server package provides:

- 🔄 **Serialization**: Convert application objects to JSON:API-compliant documents.
- 📥 **Request Parsing**: Validate and extract data from incoming requests.
- ❓ **Query Parsing**: Parse and interpret query parameters like `fields`, `include`, and `sort`.
- ⚙️ Type-safe, composable APIs built on zod.

## Next Steps

- [Error Handling](/error-handling): Handle JSON:API errors returned to clients.
- [Serialization](/serialization): Define serializers for your resources and produce JSON:API documents.
- [Parsing Request Bodies](/parsing-request-bodies): Validate and extract structured resource data from JSON payloads.
- [Parsing Query Parameters](/parsing-query-parameters): Handle fields, includes, pagination, and more.
