# Handling Relationships

The deserializer supports parsing relationships with different cardinalities and conditionally expands relationship data
from the document's `included` section when configured to do so.

## Cardinalities Supported

- `one`: Relationship must reference exactly one resource.
- `one_nullable`: Relationship references zero or one resource (can be `null`).
- `many`: Relationship references multiple resources.

## Included Resources

Relationship expansion from the `included` array only happens when the relationship is configured with an `included`
option. This instructs the deserializer to:

- Find the referenced resource(s) in the `included` section,
- Validate the resource(s) using the provided configuration,
- Recursively apply relationship deserializers if specified.

If the `included` option is not provided, the relationship data will only include resource identifiers (`id`) without
expanded fields.

## Optional Relationships

A declared relationship is required by default, so a resource that omits it fails the parse rather than reading as
absent. Mark a relationship `optional` when the server serves it only on request, such as one outside the default
sparse fieldset:

```ts
const deserialize = createDeserializer({
  type: "location",
  cardinality: "many",
  attributesSchema: z.object({ name: z.string() }),
  relationships: {
    availabilities: {
      type: "availability",
      cardinality: "many",
      optional: true,
    },
  },
});
```

The key becomes optional in the deserialized type as well, so consumers narrow before reading it:

```ts
const document = deserialize(input);
console.log(document.data[0].availabilities?.length);
```

If every declared relationship is optional, the `relationships` member itself may be absent from the resource.

`optional` accepts `true` and nothing else. The deserialized type is fixed when the deserializer is declared, so a flag
that varies at runtime could only disagree with it. Leave the field out for a required relationship.

## Error Handling

- If a relationship is configured with `included` but the related resource is missing from included, deserialization
  throws an error indicating a missing resource.
- If the included resource fails schema validation, a `$ZodError` is thrown.
- If a relationship is absent and not marked `optional`, a `$ZodError` is thrown.

## Example: One Relationship with Included Expansion

```ts
const petAttributes = z.object({ species: z.string() });

const deserialize = createDeserializer({
  type: "user",
  cardinality: "one",
  attributesSchema: z.object({ name: z.string(), age: z.number() }),
  relationships: {
    pet: {
      type: "pet",
      cardinality: "one",
      included: {
        attributesSchema: petAttributes,
      },
    },
  },
});
```

Input document:

```json
{
  "data": {
    "id": "u1",
    "type": "user",
    "attributes": { "name": "Alice", "age": 30 },
    "relationships": {
      "pet": { "data": { "id": "p1", "type": "pet" } }
    }
  },
  "included": [
    {
      "id": "p1",
      "type": "pet",
      "attributes": { "species": "dog" }
    }
  ]
}
```

Result:

```ts
const document = deserialize(input);
console.log(document.data.pet.species); // "dog"
```

## Nested Included Relationships

The deserializer supports deep nesting by allowing included relationships to themselves specify included relationships.

## Summary

- Relationship expansion depends on presence of the included option.
- Missing or invalid included resources cause errors.
- Relationships without included are deserialized as resource identifiers only.
- Relationships are required unless marked `optional`.
- Deeply nested included relationships are supported recursively.
