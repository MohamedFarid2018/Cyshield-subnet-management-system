import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import Joi from 'joi';
import { register, login, refresh, logout } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  // Only enforce in production — dev/test environments have no hard limit
  skip: () => process.env.NODE_ENV !== 'production',
  message: { message: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,128}$/;

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string()
    .pattern(PASSWORD_REGEX)
    .required()
    .messages({
      'string.pattern.base':
        'Password must be 8–128 characters and include a lowercase letter, an uppercase letter, a number, and a special character',
    }),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/refresh', authLimiter, refresh);
router.post('/logout', authenticate, logout);

export default router;
