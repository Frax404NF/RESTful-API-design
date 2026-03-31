import { Router } from 'express'
import { validateBody, validateParams } from '../middleware/validation.ts'
import { z } from 'zod'
import { authenticationToken } from '../middleware/auth.ts'
import {
  createHabit,
  getUserHabits,
  getHabitById,
  updateHabit,
  deleteHabit,
  completeHabit,
  getHabitsByTag,
  addTagsToHabit,
  getHabitStats,
} from '../controller/habitController.ts'

const router = Router()

router.use(authenticationToken)

// ── Validation Schemas ──────────────────────────────────
const uuidSchema = z.object({
  id: z.string().uuid('Invalid habit ID format'),
})

const createHabitSchema = z.object({
  name: z.string().min(1, 'Habit name is required').max(100, 'Name too long'),
  description: z.string().optional(),
  frequency: z.enum(['daily', 'weekly', 'monthly'], 'Frequency must be daily, weekly, or monthly'),
  targetCount: z.number().int().positive().optional().default(1),
  tagIds: z.array(z.string().uuid()).optional(),
})

const updateHabitSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
  targetCount: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
  tagIds: z.array(z.string().uuid()).optional(),
})

const completeHabitSchema = z.object({
  note: z.string().optional(),
})

router.get('/', getUserHabits)
router.get('/:id', validateParams(uuidSchema), getHabitById)
router.post('/', validateBody(createHabitSchema), createHabit)
router.put('/:id', validateParams(uuidSchema), validateBody(updateHabitSchema), updateHabit)
router.delete('/:id', validateParams(uuidSchema), deleteHabit)

router.post(
  '/:id/complete',
  validateParams(uuidSchema),
  validateBody(completeHabitSchema),
  completeHabit
)

router.get(
  '/tag/:tagId',
  validateParams(z.object({ tagId: z.string().uuid() })),
  getHabitsByTag
)

router.post(
  '/:id/tags',
  validateParams(uuidSchema),
  validateBody(z.object({ tagIds: z.array(z.string().uuid()).min(1) })),
  addTagsToHabit
)

router.get(
  '/:id/stats',
  validateParams(uuidSchema),
  getHabitStats
)

export default router