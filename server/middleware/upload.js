import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { allowedMimes, extensionForMime } from '../config/fileRules.js';
import { ApiError } from '../utils/ApiError.js';

const uploadDirectory = path.resolve(process.env.UPLOAD_DIR || 'uploads');
fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (_request, _file, callback) => callback(null, uploadDirectory),
  filename: (_request, file, callback) => callback(null, `${crypto.randomUUID()}${extensionForMime(file.mimetype)}`),
});

export const uploadSingleFile = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => {
    if (!allowedMimes.has(file.mimetype)) {
      return callback(new ApiError(400, 'Only PDF, Word, JPG, PNG, and WEBP files are accepted'));
    }
    return callback(null, true);
  },
}).single('file');