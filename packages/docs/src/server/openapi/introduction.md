# Introduction

## What is OpenAPI?

OpenAPI is a powerful specification for describing RESTful APIs. It provides a standard, language-agnostic interface to
REST APIs which allows both humans and machines to discover and understand the capabilities of a service without access
to source code or additional documentation.

By using OpenAPI, you can:

- Automatically generate interactive API documentation
- Validate requests and responses
- Generate client SDKs in multiple languages
- Improve API discoverability and consistency

## Why Use @jsonapi-serde/openapi?

The `@jsonapi-serde/openapi` package helps you build OpenAPI specifications tailored for JSON:API-compliant services.  
It leverages the [`openapi3-ts`](https://github.com/metadevpro/openapi3-ts) package under the hood to generate fully
compliant OpenAPI 3.1 specs.

This means:

- Simplified construction of resource, relationship, and error schemas aligned with JSON:API.
- Easy generation of request and response objects for API endpoints.
- Better DX when writing and maintaining API specs.

Whether you're documenting an existing API or building new ones from scratch, `@jsonapi-serde/openapi` makes it easier
to keep your OpenAPI specs accurate and maintainable.
