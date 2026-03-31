import type { Request, Response } from 'express'
import type { AuthenticationRequest } from '../middleware/auth.ts'
import { db } from '../db/connection.ts'
import { tags, habitTags } from '../db/schema.ts'
import { eq } from 'drizzle-orm'

// CREATE TAG — POST /api/tags
// Pattern: 409 Conflict check (duplicate name prevention)
export const createTag = async (req: AuthenticationRequest, res: Response) => {
  try {
    const { name, color } = req.body

    // Check for duplicate tag name
    const existingTag = await db.query.tags.findFirst({
      where: eq(tags.name, name),
    })

    if (existingTag) {
      return res.status(409).json({ error: 'Tag with this name already exists' })
    }

    const [newTag] = await db
      .insert(tags)
      .values({
        name,
        color: color || '#6B7280',
      })
      .returning()

    res.status(201).json({
      message: 'Tag created successfully',
      tag: newTag,
    })
  } catch (error) {
    console.error('Create tag error:', error)
    res.status(500).json({ error: 'Failed to create tag' })
  }
}

// READ ALL — GET /api/tags
// Pattern: Simple select with ordering
export const getTags = async (req: Request, res: Response) => {
  try {
    const allTags = await db
      .select()
      .from(tags)
      .orderBy(tags.name)

    res.json({
      tags: allTags,
    })
  } catch (error) {
    console.error('Get tags error:', error)
    res.status(500).json({ error: 'Failed to fetch tags' })
  }
}

// READ ONE — GET /api/tags/:id
// Pattern: Reverse relational query (tag → habitTags → habits)
export const getTagById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const tag = await db.query.tags.findFirst({
      where: eq(tags.id, id),
      with: {
        habitTags: {
          with: {
            habit: {
              columns: {
                id: true,
                name: true,
                description: true,
                isActive: true,
              },
            },
          },
        },
      },
    })

    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' })
    }

    // Reshape: flatten junction table
    const tagWithHabits = {
      ...tag,
      habits: tag.habitTags.map((ht) => ht.habit),
      habitTags: undefined,
    }

    res.json({
      tag: tagWithHabits,
    })
  } catch (error) {
    console.error('Get tag error:', error)
    res.status(500).json({ error: 'Failed to fetch tag' })
  }
}

// UPDATE TAG — PUT /api/tags/:id
// Pattern: 409 Conflict with self-exclusion (allow keeping own name)
export const updateTag = async (req: AuthenticationRequest, res: Response) => {
  try {
    const { id } = req.params
    const { name, color } = req.body

    // If updating name, check for duplicates (but exclude self)
    if (name) {
      const existingTag = await db.query.tags.findFirst({
        where: eq(tags.name, name),
      })

      if (existingTag && existingTag.id !== id) {
        return res.status(409).json({ error: 'Tag with this name already exists' })
      }
    }

    const [updatedTag] = await db
      .update(tags)
      .set({
        ...(name && { name }),
        ...(color && { color }),
        updatedAt: new Date(),
      })
      .where(eq(tags.id, id))
      .returning()

    if (!updatedTag) {
      return res.status(404).json({ error: 'Tag not found' })
    }

    res.json({
      message: 'Tag updated successfully',
      tag: updatedTag,
    })
  } catch (error) {
    console.error('Update tag error:', error)
    res.status(500).json({ error: 'Failed to update tag' })
  }
}

// DELETE TAG — DELETE /api/tags/:id
// Pattern: .returning() for 404 detection
export const deleteTag = async (req: AuthenticationRequest, res: Response) => {
  try {
    const { id } = req.params

    const [deletedTag] = await db
      .delete(tags)
      .where(eq(tags.id, id))
      .returning()

    if (!deletedTag) {
      return res.status(404).json({ error: 'Tag not found' })
    }

    res.json({
      message: 'Tag deleted successfully',
    })
  } catch (error) {
    console.error('Delete tag error:', error)
    res.status(500).json({ error: 'Failed to delete tag' })
  }
}

// POPULAR TAGS — GET /api/tags/popular
// Pattern: In-memory aggregation (count via array length + sort)
export const getPopularTags = async (req: Request, res: Response) => {
  try {
    const tagsWithCount = await db.query.tags.findMany({
      with: {
        habitTags: true,
      },
    })

    const popularTags = tagsWithCount
      .map((tag) => ({
        id: tag.id,
        name: tag.name,
        color: tag.color,
        usageCount: tag.habitTags.length,
        createdAt: tag.createdAt,
        updatedAt: tag.updatedAt,
      }))
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10)

    res.json({
      tags: popularTags,
    })
  } catch (error) {
    console.error('Get popular tags error:', error)
    res.status(500).json({ error: 'Failed to fetch popular tags' })
  }
}
