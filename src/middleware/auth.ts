import { Request, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthedRequest extends Request {
  userId: string;
  isAuth: boolean;
}

export const isAuthMiddleware: RequestHandler = async (
  req: AuthedRequest,
  res,
  next
) => {
  const authHeader = req.get('Authorization');
  if (!authHeader) {
    req.isAuth = false;
    return next();
  }
  const [_, token] = authHeader.split(' ');
  // ! I do not fully agree with this logic, looks like the code after the catch will never execute, I don't think there's a chance that the decoding is invalid and the method does not throw an error, but I will follow along
  let decoded: { userId: string };
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET) as { userId: string };
  } catch (decodeError) {
    console.error({ decodeError });
    req.isAuth = false;
    return next();
  }
  if (!decoded) {
    req.isAuth = false;
    return next();
  }
  //TODO: fix typescript in request here
  req.userId = decoded.userId;
  req.isAuth = true;
  next();
};
