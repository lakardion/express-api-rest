import { check } from 'express-validator';

export const createEditPostValidators = [
  check('title').isLength({ min: 5 }).withMessage('Title is required').trim(),
  check('content')
    .isLength({ min: 5 })
    .withMessage('Content is required')
    .trim(),
];
