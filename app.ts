import bodyParser from 'body-parser';
import chalk from 'chalk';
import 'dotenv/config';
import express, { ErrorRequestHandler, Request, RequestHandler } from 'express';
import { graphqlHTTP } from 'express-graphql';
import mongoose from 'mongoose';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { ApiErrors, Unauthorized } from './src/errors/index.js';
import { resolvers } from './src/graphql/resolvers.js';
import { schema } from './src/graphql/schema.js';
import { AuthedRequest, isAuthMiddleware } from './src/middleware/auth.js';
import { deleteImage } from './src/utis/index.js';

const __filename = fileURLToPath(import.meta.url);
export const __basedirname = path.dirname(__filename);
const IMAGES_FILE_FOLDER = 'images';

const getMulterMiddleware = () => {
  //set where the files are going to be stored
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, IMAGES_FILE_FOLDER);
    },
    filename: (req, file, cb) => {
      cb(null, `${new Date().toISOString()}-${file.originalname}`);
    },
  });
  // set which files we want to include
  const fileFilter = (
    req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback
  ) => {
    if (
      file.mimetype === 'image/png' ||
      file.mimetype === 'image/jpeg' ||
      file.mimetype === 'image/jpg'
    )
      cb(null, true);
    else cb(null, false);
  };

  const FORM_FIELD_TO_SNIFF_FILE_FROM = 'image';
  //return the middleware with the right configuration
  return multer({ storage, fileFilter }).single(FORM_FIELD_TO_SNIFF_FILE_FROM);
};
const corsMiddleware: RequestHandler = (req, res, next) => {
  // ! we could lock this to certain domains only
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, PATCH, DELETE'
  );
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  //We don't want to check options for graphql
  if (req.path === '/graphql' && req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
};
const errorMiddleware: ErrorRequestHandler = (
  error: ApiErrors,
  req,
  res,
  next
) => {
  console.error(error);
  const status = error.statusCode;
  const message = error.message;
  const data = error.data;
  res.status(status).json({
    message,
    data,
  });
};

const app = express();
app.use(getMulterMiddleware());
app.use(bodyParser.json());
app.use(
  '/images',
  express.static(path.join(__basedirname, IMAGES_FILE_FOLDER))
);
app.use(corsMiddleware);
app.use(isAuthMiddleware);

app.put('/post-image', (req: AuthedRequest, res, next) => {
  if (!req.isAuth) {
    throw new Unauthorized("You're not authorized to perform this asction");
  }
  if (!req.file) {
    res.status(200).json({ message: 'No file provided' });
  }
  if (req.body.oldPath) {
    deleteImage(req.body.oldPath);
  }
  return res
    .status(201)
    .json({ message: 'File stored', filePath: req.file.path });
});

app.use(
  '/graphql',
  graphqlHTTP({
    schema,
    rootValue: resolvers,
    graphiql: true,
    customFormatErrorFn: (error) => {
      if (!error.originalError) {
        return error;
      }
      //! blasphemy :cry:
      const apiError = error.originalError as unknown as ApiErrors;
      const { data, statusCode, message } = apiError;
      return {
        message,
        data,
        statusCode,
      };
    },
  })
);
app.use(errorMiddleware);

const port = process.env.PORT || 8080;

try {
  // top lvl await ftw
  if (!process.env.MONGO_DB_URI)
    throw new Error('No mongodb uri to connect to...');
  const db = await mongoose.connect(process.env.MONGO_DB_URI);
  app.listen(port, () => {
    console.debug(chalk.blue('Server up and running on: ', port));
  });
} catch (dbError) {
  console.error(chalk.red('DB error'), { dbError });
}
