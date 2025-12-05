import * as path from 'path';
import * as fs from 'fs';

export const NODE_ENV = process.env.NODE_ENV || 'development';
const ENV_FILE_CANDIDATE = path.resolve(
  process.cwd(),
  `env/app.${NODE_ENV}.env`,
);
export const ENV_FILE_PATHS = fs.existsSync(ENV_FILE_CANDIDATE)
  ? [ENV_FILE_CANDIDATE]
  : [];

// UID Generator
export { generateUid, generateUniqueUid } from './uid-generator';
