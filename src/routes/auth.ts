import { Router } from 'express';
import { body } from 'express-validator';
import { login, signup } from '../controllers/auth.js';
import { getUserStatus, updateUserStatus } from '../controllers/feed.js';
import { isAuthMiddleware } from '../middleware/is-auth.js';
import { User } from '../models/index.js';

const router = Router();

router.put(
  '/signup',
  [
    body('email')
      .isEmail()
      .withMessage('Please enter a valid email.')
      .custom(async (value, { req }) => {
        const user = await User.findOne({ email: value });
        if (user) {
          throw new Error(
            'User with that email already exists, please choose another one'
          );
        }
      })
      .normalizeEmail(),
    body('password').trim().isLength({ min: 5 }),
    body('name').trim().not().isEmpty(),
  ],
  signup
);

router.post('/login', login);
router.patch(
  '/status',
  isAuthMiddleware,
  [body('status').trim().not().isEmpty()],
  updateUserStatus
);

router.get('/status', isAuthMiddleware, getUserStatus);

export { router as authRouter };
