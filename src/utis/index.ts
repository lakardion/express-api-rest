import { unlink } from 'fs/promises';
import path from 'path';
import { __basedirname } from '../../app.js';

export const deleteImage = (imageRelPath: string) => {
  const imagePath = path.join(__basedirname, imageRelPath);
  return unlink(imagePath).catch((reason) =>
    console.error('File delete failed', reason)
  );
};
