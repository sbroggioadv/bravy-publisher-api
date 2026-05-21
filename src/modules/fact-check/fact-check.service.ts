import { Injectable } from '@nestjs/common';
import { validate } from './validate';
import { CarouselData, ValidationResult } from './types';

@Injectable()
export class FactCheckService {
  validate(data: CarouselData): ValidationResult {
    return validate(data);
  }

  validateStrict(data: CarouselData): void {
    const result = validate(data);
    if (!result.ok) {
      throw new Error(
        `Fact-check failed: ${result.issues.join('; ')}`,
      );
    }
  }
}
