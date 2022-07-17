import { Router } from 'express';
import {
  createPost,
  deletePost,
  editPost,
  getPost,
  getPosts,
} from '../controllers/feed.js';
import { isAuthMiddleware } from '../middleware/is-auth.js';
import { createEditPostValidators } from './validators/feed-validators.js';
import { createPostValidators } from './validators/index.js';

const router = Router();

router.get('/posts', isAuthMiddleware, getPosts);
router.post('/post', isAuthMiddleware, createPostValidators, createPost);
router.get('/post/:postId', isAuthMiddleware, getPost);
router.put(
  '/post/:postId',
  isAuthMiddleware,
  createEditPostValidators,
  editPost
);
router.delete('/post/:postId', isAuthMiddleware, deletePost);

export { router as feedRouter };
