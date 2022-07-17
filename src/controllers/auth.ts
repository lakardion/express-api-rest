import { RequestHandler } from 'express';
import { validationResult } from 'express-validator';
import { User } from '../models/index.js';
import { createValidationError } from './utls/index.js';
import bcryptjs from 'bcryptjs';
import {
  InternalServerError,
  NotFound,
  Unauthorized,
} from '../errors/index.js';
import jsonwebtoken from 'jsonwebtoken';

const { hash, compare } = bcryptjs;
const { sign } = jsonwebtoken;

export const signup: RequestHandler = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return createValidationError(next, errors.array());
  }
  const { email, name, password } = req.body;
  const hashedPsw = await hash(password, 12);
  try {
    const user = new User({
      email,
      password: hashedPsw,
      name,
      posts: [],
    });
    const userResult = await user.save();
    res.status(201).json({
      message: 'User created',
      userId: userResult._id,
    });
  } catch (userCreateError) {
    console.error(userCreateError);
    const error = new InternalServerError('Error while creating the user');
    next(error);
  }
};

export const login: RequestHandler = async (req, res, next) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    const error = new NotFound('User not found');
    return next(error);
  }
  const isPasswordValid = await compare(password, user.password);
  if (!isPasswordValid) {
    const error = new Unauthorized('Invalid credentials');
    return next(error);
  }

  const token = sign(
    {
      email: user.email,
      userId: user._id,
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  res.status(200).json({
    message: 'Successfully logged in',
    token,
    userId: user._id.toString(),
  });
};
