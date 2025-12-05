import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  uploadPath: process.env.UPLOADS_PATH ?? '/app/uploads',
  maxFileSize: process.env.MAX_FILE_SIZE ?? 20 * 1024 * 1024,
}));
