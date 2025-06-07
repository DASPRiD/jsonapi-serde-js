# Getting Started

## Installation

::: code-group

```sh [npm]
$ npm add @jsonapi-serde/openapi openapi3-ts zod
```

```sh [pnpm]
$ pnpm add @jsonapi-serde/openapi openapi3-ts zod
```

```sh [yarn]
$ yarn add @jsonapi-serde/openapi openapi3-ts zod
```

```sh [bun]
$ bun add @jsonapi-serde/openapi openapi3-ts zod
```

:::

## Basic Setup

Import the functions you need from @jsonapi-serde/openapi and start building your OpenAPI schemas:

```ts
import { buildResourceRequestContentObject } from "@jsonapi-serde/openapi";
import { z } from "zod/v4";

const attributesSchema = z.object({
  name: z.string(),
  age: z.number().optional(),
});

const personRequestContentObject = buildResourceRequestContentObject({
  type: "person",
  attributesSchema,
});

console.log(personRequestContentObject);
```

This will generate a content object for your OpenAPI spec compliant with JSON:API standards.
