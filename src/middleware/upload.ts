import multer from 'multer';

const maxFileSizeMb = Number(process.env.MAX_UPLOAD_MB || '5');

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxFileSizeMb * 1024 * 1024,
  },
});
