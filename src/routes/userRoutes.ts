import { Router } from 'express'
import { authenticationToken } from '../middleware/auth.ts'
import { validateBody } from '../middleware/validation.ts'
import { z } from 'zod'
import {
  getProfile,
  updateProfile,
  changePassword,
} from '../controller/userController.ts'

const router = Router()

router.use(authenticationToken)

const updateProfileSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username too long')
    .optional(),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain uppercase, lowercase, and number'
    ),
})

router.get('/profile', getProfile)
router.put('/profile', validateBody(updateProfileSchema), updateProfile)
router.post('/change-password', validateBody(changePasswordSchema), changePassword)

export default router