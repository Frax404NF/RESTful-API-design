import { Router } from 'express'
import { authenticationToken } from '../middleware/auth.ts'
import { validateBody, validateParams } from '../middleware/validation.ts'
import { z } from 'zod'
import {
  createTag,
  getTags,
  getTagById,
  updateTag,
  deleteTag,
  getPopularTags,
} from '../controller/tagController.ts'

const router = Router()

router.use(authenticationToken)

const createTagSchema = z.object({
  name: z.string().min(1, 'Tag name is required').max(50, 'Name too long'),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color')
    .optional(),
})

const updateTagSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color')
    .optional(),
})

const uuidSchema = z.object({
  id: z.string().uuid('Invalid tag ID format'),
})

router.get('/', getTags)
router.get('/popular', getPopularTags)
router.get('/:id', validateParams(uuidSchema), getTagById)
router.post('/', validateBody(createTagSchema), createTag)
router.put('/:id', validateParams(uuidSchema), validateBody(updateTagSchema), updateTag)
router.delete('/:id', validateParams(uuidSchema), deleteTag)

export default router
