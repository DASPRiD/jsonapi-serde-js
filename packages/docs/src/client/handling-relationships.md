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

## Error Handling

- If a relationship is configured with `included` but the related resource is missing from included, deserialization
  throws an error indicating a missing resource.
- If the included resource fails schema validation, a ZodError is thrown.

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
- Deeply nested included relationships are supported recursively.
