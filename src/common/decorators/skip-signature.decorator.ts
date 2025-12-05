// src/common/decorators/skip-signature.decorator.ts
import { SetMetadata } from '@nestjs/common';
export const SKIP_SIGNATURE_KEY = 'skip-signature';
export const SkipSignature = () => SetMetadata(SKIP_SIGNATURE_KEY, true);
