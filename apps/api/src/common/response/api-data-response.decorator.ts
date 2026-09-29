import { applyDecorators, type Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';

// Shows { success, data, meta? } in Swagger instead of the bare model
export function ApiDataResponse(
  model: Type<unknown>,
  options: { isArray?: boolean; paged?: boolean; status?: 200 | 201 } = {},
) {
  const item = { $ref: getSchemaPath(model) };
  const data =
    options.isArray || options.paged ? { type: 'array', items: item } : item;
  const meta = {
    type: 'object',
    properties: {
      page: { type: 'integer', example: 1 },
      pageSize: { type: 'integer', example: 50 },
      total: { type: 'integer', example: 20 },
    },
  };

  return applyDecorators(
    ApiExtraModels(model),
    ApiResponse({
      status: options.status ?? 200,
      schema: {
        properties: {
          success: { type: 'boolean', example: true },
          data,
          ...(options.paged ? { meta } : {}),
        },
      },
    }),
  );
}
