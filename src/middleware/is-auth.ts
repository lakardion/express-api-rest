import { Request, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { InternalServerError, Unauthorized } from '../errors/index.js';

export interface RequestWithUserId extends Request {
  userId: string;
}

export const isAuthMiddleware: RequestHandler = async (
  req: RequestWithUserId,
  res,
  next
) => {
  const authHeader = req.get('Authorization');
  if (!authHeader) {
    return next(new Unauthorized("You're not allowed to access this resource"));
  }
  const [_, token] = authHeader.split(' ');
  // ! I do not fully agree with this logic, looks like the code after the catch will never execute, I don't think there's a chance that the decoding is invalid and the method does not throw an error, but I will follow along
  let decoded: { userId: string };
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET) as { userId: string };
  } catch (decodeError) {
    console.error({ decodeError });
    const error = new InternalServerError('Error while decoding the token');
    return next(error);
  }
  if (!decoded) {
    const error = new Unauthorized(
      "You're not allowed to access this resource"
    );
    return next(error);
  }
  //TODO: fix typescript in request here
  req.userId = decoded.userId;
  next();
};
