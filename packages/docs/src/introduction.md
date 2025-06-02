# Introduction

Welcome to **@jsonapi-serde**, a modular toolkit for working with [JSON:API 1.1](https://jsonapi.org/) documents – both
on the server and the client.

This project is built with **type safety**, **spec compliance**, and **framework independence** in mind.

## What Is @jsonapi-serde?

`@jsonapi-serde` is a suite of TypeScript libraries that make it easier to build and consume JSON:API 1.1-compliant
APIs. It is organized into several packages, each focused on a specific concern.

### 🔧 Server Package: `@jsonapi-serde/server`

This core package provides:

- **Serialization** of your application's entities into JSON:API 1.1 documents.
- **Deserialization** of JSON:API 1.1 request bodies into validated objects.
- **Parsing of spec-defined query parameters**, such as `fields`, `include`, `sort`, `page`, and `filter`.

This package is **framework-agnostic**, meaning you can use it with any Node.js web framework.

### 🌐 Framework Integrations

To ease integration with specific web servers, additional packages provide glue code. For now:

- **Koa Integration**: `@jsonapi-serde/integration-koa`  
  This adapter simplifies request/response handling in Koa apps.

More integrations (e.g., for Express, Hapi, Fastify) can be added based on demand or contributions.

### 📦 Client Package: `@jsonapi-serde/client`

This package helps consumers of JSON:API 1.1 APIs:

- **Deserialize** JSON:API 1.1 documents into simple, typed JavaScript/TypeScript objects.
- **Handle error documents** in a consistent and type-safe way.
- **Extract and inject pagination parameters** from/to top-level `links`.

Use it in frontend apps, CLI tools, or other services that consume JSON:API responses.

## Why Use This?

- ✅ Full support for **JSON:API 1.1**
- ✅ Strong TypeScript typings
- ✅ Modular design (use only what you need)
- ✅ Compliant with the spec — not a "close-enough" approximation
- ✅ Focused on real-world DX (developer experience)

## Next Steps

Pick your perspective:

- Are you building a **JSON:API server**? Start with [Server Documentation](../server/getting-started).
- Are you consuming a JSON:API from the **client**? Jump to [Client Documentation](../client/installation).
