import type { SchemaObject } from "openapi3-ts/oas31";
import type { $ZodType } from "zod/v4/core";
import { toJSONSchema } from "zod/v4/core";

/**
 * Converts the input side of a zod schema to JSON Schema 2020-12, which OpenAPI 3.1 builds on
 *
 * The root `$schema` the conversion adds is removed: per OpenAPI 3.1.1 §4.8.24.5 it would override
 * the document's dialect, the OpenAPI one by default, with plain JSON Schema 2020-12.
 */
export const toSchemaObject = (schema: $ZodType): SchemaObject => {
    const { $schema: _dialect, ...schemaObject } = toJSONSchema(schema, {
        io: "input",
        target: "draft-2020-12",
    });

    return schemaObject as SchemaObject;
};
