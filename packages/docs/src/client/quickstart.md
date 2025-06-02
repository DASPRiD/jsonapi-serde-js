# Quickstart

The client package helps you deserialize JSON:API 1.1 responses into easy-to-use JavaScript objects, flattening nested
relationships for straightforward access.

## 1. Define your schema and create a deserializer

```ts
import { createDeserializer, type Relationships } from "@jsonapi-serde/client";
import { z } from "zod/v4/mini";

const attributesSchema = z.object({
    title: z.string(),
    content: z.string(),
});

const relationships = {
    author: {
        type: "people",
        cardinality: "one",
        included: {
            attributesSchema: z.object({
                name: z.string(),
                email: z.email(),
            }),
        },
    },
} satisfies Relationships;

const deserialize = createDeserializer({
    type: "articles",
    cardinality: "one",
    attributesSchema,
    relationships,
});
```
## 2. Fetch data and handle errors

```ts
import { handleJsonApiError } from "@jsonapi-serde/client";

const response = await fetch("/api/articles/1");
await handleJsonApiError(response);
const json = await response.json();
```

## 3. Deserialize the JSON:API response

```ts
const article = deserialize(json);

console.log(article.title);
console.log(article.author.name);
```
