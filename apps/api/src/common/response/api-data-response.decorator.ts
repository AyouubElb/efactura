import { applyDecorators, type Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';

// Shows { success, data } in Swagger instead of the bare model
export function ApiDataResponse(
  model: Type<unknown>,
  options: { isArray?: boolean } = {},
) {
  const data = options.isArray
    ? { type: 'array', items: { $ref: getSchemaPath(model) } }
    : { $ref: getSchemaPath(model) };

  return applyDecorators(
    ApiExtraModels(model),
    ApiOkResponse({
      schema: {
        properties: {
          success: { type: 'boolean', example: true },
          data,
        },
      },
    }),
  );
}
