import 'dotenv/config';
import chalk from 'chalk';
import express from 'express';
import bodyParser from 'body-parser';
import { feedRouter } from './routes/feed.js';
import mongoose from 'mongoose';

const app = express();

app.use(bodyParser.json());
app.use((req, res, next) => {
  // ! we could lock this to certain domains only
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, PATCH, DELETE'
  );
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

const port = process.env.PORT || 8080;

try {
  // top lvl await ftw
  const db = await mongoose.connect(process.env.MONGO_DB_URI);
  app.listen(port, () => {
    console.log(chalk.green(`Server up and running in ${port}`));
  });
} catch (dbError) {
  console.error(chalk.red('DB error'), { dbError });
}
