import { Router } from 'express'
import { validateBody, validateParams } from '../middleware/validation.ts'
import { z } from 'zod'
import { authenticationToken } from '../middleware/auth.ts'

const createHabitSchema = z.object({
  name: z.string(),
})

const completeParamsSchema = z.object({
  id: z.string().max(3),
})

const router = Router()

router.use(authenticationToken)

router.get('/', (req, res) => {
  res.json({ message: 'habits' })
})

router.get('/:id', (req, res) => {
  res.json({ message: 'got one habbit' })
})

router.post('/', validateBody(createHabitSchema), (req, res) => {
  res.status(201).json({ message: 'created habit' })
})

router.delete('/:id', (req, res) => {
  res.json({ message: 'deleted habit' })
})

router.post(
  '/:id/complete',
  validateParams(completeParamsSchema),
  validateBody(createHabitSchema),
  (req, res) => {
    res.json({ message: 'completed habit' }).status(201)
  }
)

export default router