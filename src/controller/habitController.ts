import type { Response } from "express";
import type { AuthenticationRequest } from "../middleware/auth.ts";
import { db } from '../db/connection.ts'
import { habits, entries, habitTags, tags } from '../db/schema.ts'
import { eq, and, desc, inArray } from 'drizzle-orm'

export const createHabit = async (req: AuthenticationRequest, res: Response) => {
  try {
    const { name, description, frequency, targetCount, tagIds } = req.body

    const result = await db.transaction(async (tx) => {
      const [newHabit] = await tx.insert(habits).values({
        userId: req.user.id,
        name,
        description,
        frequency,
        targetCount,
      })
        .returning()

      if (tagIds && tagIds.length > 0) {
        const habitTagValues = tagIds.map((tagId) => ({
          habitId: newHabit.id,
          tagId
        }))

        await tx.insert(habitTags).values(habitTagValues)
      }

      return newHabit
    })

    res.status(201).json({
      message: 'Habit created',
      habit: result,
    })
  } catch (e) {
    console.error('Create habit error', e)
    res.status(500).json({ error: 'Failed to create habit' })
  }
}

export const getUserHabits = async (req: AuthenticationRequest, res: Response) => {
  try {
    const userHabitswithTags = await db.query.habits.findMany({
      where: eq(habits.userId, req.user!.id),
      with: {
        habitTags: {
          with: {
            tag: true,
          },
        },
      },
      orderBy: [desc(habits.createdAt)],
    })

    const habitswithTags = userHabitswithTags.map(habit => ({
      ...habit,
      tags: habit.habitTags.map((ht) => ht.tag),
      habitTags: undefined,
    }))

    res.json({
      habits: habitswithTags,
    })
  } catch (e) {
    console.error('Get habit error', e)
    res.status(500).json({ error: 'Failed to fetch habit' })
  }
}

export const updateHabit = async (req: AuthenticationRequest, res: Response) => {
  try {
    const id = req.params.id
    const { tagIds, ...updates } = req.body

    const result = await db.transaction(async (tx) => {
      const [updateHabit] = await tx
        .update(habits)
        .set({ ...updates, updatedAt: new Date() })
        .where(and(eq(habits.id, id), eq(habits.userId, req.user.id)))
        .returning()

      if (!updateHabit) {
        return res.status(401).end()
      }

      if (tagIds !== undefined) {
        await tx.delete(habitTags).where(eq(habitTags.habitId, id))

        if (tagIds.length > 0) {
          const habitTagValues = tagIds.map((tagId) => ({
            habitId: id,
            tagId,
          }))

          await tx.insert(habitTags).values(habitTagValues)
        }
      }

      return updateHabit
    })

    res.json({
      message: 'Habit was updated',
      habit: result,
    })
  } catch (e) {
    console.error('Update habit error', e)
    res.status(500).json({ error: 'Failed to updatec habit' })
  }
}

export const deleteHabit = async (req: AuthenticationRequest, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user!.id

    const [deletedHabit] = await db
      .delete(habits)
      .where(and(eq(habits.id, id), eq(habits.userId, userId)))
      .returning()

    if (!deletedHabit) {
      return res.status(404).json({ error: 'Habit not found' })
    }

    res.json({
      message: 'Habit deleted successfully',
    })
  } catch (error) {
    console.error('Delete habit error:', error)
    res.status(500).json({ error: 'Failed to delete habit' })
  }
}