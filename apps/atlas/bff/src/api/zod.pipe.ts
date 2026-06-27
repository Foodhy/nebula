import { BadRequestException, type PipeTransform } from '@nestjs/common';
import type { ZodTypeAny, z } from 'zod';

/** Validates a handler argument against a Zod schema (CLAUDE.md: validate all external input). */
export class ZodBody<T extends ZodTypeAny> implements PipeTransform {
  constructor(private readonly schema: T) {}
  transform(value: unknown): z.infer<T> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException(result.error.issues);
    }
    return result.data;
  }
}
