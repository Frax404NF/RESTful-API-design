import { Router } from 'express'
import { validateBody, validateParams } from '../middleware/validation.ts'
import { z } from 'zod'
import { authenticationToken } from '../middleware/auth.ts'
import { createHabit, deleteHabit, getUserHabits, updateHabit } from '../controller/habitController.ts'

const createHabitSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  frequency: z.string(),
  targetCount: z.number(),
  tagIds: z.array(z.string()).optional(),
})

const completeParamsSchema = z.object({
  id: z.string().max(3),
})

const router = Router()

router.use(authenticationToken)

router.get('/', getUserHabits)

router.patch('/:id', updateHabit)

router.get('/:id', (req, res) => {
  res.json({ message: 'got one habbit' })
})

router.post('/', validateBody(createHabitSchema), createHabit)

router.delete('/:id', deleteHabit)

router.post(
  '/:id/complete',
  validateParams(completeParamsSchema),
  validateBody(createHabitSchema),
  (req, res) => {
    res.json({ message: 'completed habit' }).status(201)
  }
)

export default router