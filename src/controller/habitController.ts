import type { Response } from "express";
import type { AuthenticationRequest } from "../middleware/auth.ts";
import { db } from '../db/connection.ts'
import { habits, entries, habitTags, tags } from '../db/schema.ts'
import { eq, and, desc, inArray, gte } from 'drizzle-orm'

// CREATE — POST /api/habits
// Pattern: Transaction (multi-table insert)
export const createHabit = async (req: AuthenticationRequest, res: Response) => {
  try {
    const { name, description, frequency, targetCount, tagIds } = req.body
    const userId = req.user!.id

    const result = await db.transaction(async (tx) => {
      const [newHabit] = await tx.insert(habits).values({
        userId,
        name,
        description,
        frequency,
        targetCount,
      })
        .returning()

      if (tagIds && tagIds.length > 0) {
        const habitTagValues = tagIds.map((tagId: string) => ({
          habitId: newHabit.id,
          tagId
        }))

        await tx.insert(habitTags).values(habitTagValues)
      }

      return newHabit
    })

    res.status(201).json({
      message: 'Habit created successfully',
      habit: result,
    })
  } catch (error) {
    console.error('Create habit error:', error)
    res.status(500).json({ error: 'Failed to create habit' })
  }
}

// READ ALL — GET /api/habits
// Pattern: Relational query with eager loading + data reshaping
export const getUserHabits = async (req: AuthenticationRequest, res: Response) => {
  try {
    const userId = req.user!.id

    // Pagination params
    const page = parseInt(req.query.page as string) || 1
    const limitParams = parseInt(req.query.limit as string) || 10
    const offset = (page - 1) * limitParams

    const userHabitsWithTags = await db.query.habits.findMany({
      where: eq(habits.userId, userId),
      with: {
        habitTags: {
          with: {
            tag: true,
          },
        },
      },
      orderBy: [desc(habits.createdAt)],
      limit: limitParams,
      offset: offset,
    })

    // Reshape: flatten junction table → direct tags array
    const habitsWithTags = userHabitsWithTags.map(habit => ({
      ...habit,
      tags: habit.habitTags.map((ht) => ht.tag),
      habitTags: undefined,
    }))

    res.json({
      habits: habitsWithTags,
    })
  } catch (error) {
    console.error('Get habits error:', error)
    res.status(500).json({ error: 'Failed to fetch habits' })
  }
}

// READ ONE — GET /api/habits/:id
// Pattern: findFirst + ownership check + entries eager loading
export const getHabitById = async (req: AuthenticationRequest, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user!.id

    const habit = await db.query.habits.findFirst({
      where: and(eq(habits.id, id), eq(habits.userId, userId)),
      with: {
        habitTags: {
          with: {
            tag: true,
          },
        },
        entries: {
          orderBy: [desc(entries.completion_date)],
          limit: 10,
        },
      },
    })

    if (!habit) {
      return res.status(404).json({ error: 'Habit not found' })
    }

    const habitWithTags = {
      ...habit,
      tags: habit.habitTags.map((ht) => ht.tag),
      habitTags: undefined,
    }

    res.json({
      habit: habitWithTags,
    })
  } catch (error) {
    console.error('Get habit error:', error)
    res.status(500).json({ error: 'Failed to fetch habit' })
  }
}

// UPDATE — PUT /api/habits/:id
// Pattern: Transaction + ownership check + tag replacement
export const updateHabit = async (req: AuthenticationRequest, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user!.id
    const { tagIds, ...updates } = req.body

    const result = await db.transaction(async (tx) => {
      const [updatedHabit] = await tx
        .update(habits)
        .set({ ...updates, updatedAt: new Date() })
        .where(and(eq(habits.id, id), eq(habits.userId, userId)))
        .returning()

      if (!updatedHabit) {
        throw new Error('Habit not found')
      }

      // Replace tags: delete old → insert new
      if (tagIds !== undefined) {
        await tx.delete(habitTags).where(eq(habitTags.habitId, id))

        if (tagIds.length > 0) {
          const habitTagValues = tagIds.map((tagId: string) => ({
            habitId: id,
            tagId,
          }))

          await tx.insert(habitTags).values(habitTagValues)
        }
      }

      return updatedHabit
    })

    res.json({
      message: 'Habit updated successfully',
      habit: result,
    })
  } catch (error: any) {
    if (error.message === 'Habit not found') {
      return res.status(404).json({ error: 'Habit not found' })
    }
    console.error('Update habit error:', error)
    res.status(500).json({ error: 'Failed to update habit' })
  }
}

// DELETE — DELETE /api/habits/:id
// Pattern: Ownership check + .returning() for 404 detection
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

// COMPLETE HABIT — POST /api/habits/:id/complete
// Pattern: Ownership verification → insert entry into related table
export const completeHabit = async (req: AuthenticationRequest, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user!.id
    const { note } = req.body

    // Verify habit exists and belongs to user
    const habit = await db.query.habits.findFirst({
      where: and(eq(habits.id, id), eq(habits.userId, userId)),
    })

    if (!habit) {
      return res.status(404).json({ error: 'Habit not found' })
    }

    // 409 Conflict check: Ensure habit hasn't been completed today
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    const existingEntry = await db.query.entries.findFirst({
      where: and(
        eq(entries.habitId, id),
        gte(entries.completion_date, today)
      )
    });

    if (existingEntry) {
      return res.status(409).json({
        error: "Habit already completed today",
        message: "You can only complete a habit once per day"
      });
    }

    // Log the completion entry
    const [entry] = await db
      .insert(entries)
      .values({
        habitId: id,
        note,
      })
      .returning()

    res.status(201).json({
      message: 'Habit completed',
      entry,
    })
  } catch (error) {
    console.error('Complete habit error:', error)
    res.status(500).json({ error: 'Failed to complete habit' })
  }
}

// GET HABITS BY TAG — GET /api/habits/tag/:tagId
// Pattern: Reverse relational query (tag → habitTags → habit)
export const getHabitsByTag = async (req: AuthenticationRequest, res: Response) => {
  try {
    const { tagId } = req.params
    const userId = req.user!.id

    // Find all habitTag records for this tag, include the habit data
    const tagWithHabits = await db.query.tags.findFirst({
      where: eq(tags.id, tagId),
      with: {
        habitTags: {
          with: {
            habit: true,
          },
        },
      },
    })

    if (!tagWithHabits) {
      return res.status(404).json({ error: 'Tag not found' })
    }

    // Filter to only this user's habits and reshape
    const userHabits = tagWithHabits.habitTags
      .map((ht) => ht.habit)
      .filter((habit) => habit.userId === userId)

    res.json({
      tag: { id: tagWithHabits.id, name: tagWithHabits.name, color: tagWithHabits.color },
      habits: userHabits,
    })
  } catch (error) {
    console.error('Get habits by tag error:', error)
    res.status(500).json({ error: 'Failed to fetch habits by tag' })
  }
}

// ADD TAGS TO HABIT — POST /api/habits/:id/tags
// Pattern: Ownership check → bulk insert into junction table
export const addTagsToHabit = async (req: AuthenticationRequest, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user!.id
    const { tagIds } = req.body

    // Verify habit exists and belongs to user
    const habit = await db.query.habits.findFirst({
      where: and(eq(habits.id, id), eq(habits.userId, userId)),
    })

    if (!habit) {
      return res.status(404).json({ error: 'Habit not found' })
    }

    // Delete existing tags and re-insert (replace strategy)
    await db.delete(habitTags).where(eq(habitTags.habitId, id))

    if (tagIds.length > 0) {
      const habitTagValues = tagIds.map((tagId: string) => ({
        habitId: id,
        tagId,
      }))
      await db.insert(habitTags).values(habitTagValues)
    }

    res.json({
      message: 'Tags updated for habit',
    })
  } catch (error) {
    console.error('Add tags to habit error:', error)
    res.status(500).json({ error: 'Failed to add tags to habit' })
  }
}

// GET HABIT STATS — GET /api/habits/:id/stats
// Pattern: In-memory aggregation & streak calculation
export const getHabitStats = async (req: AuthenticationRequest, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user!.id

    const habit = await db.query.habits.findFirst({
      where: and(eq(habits.id, id), eq(habits.userId, userId)),
      with: {
        entries: {
          orderBy: [desc(entries.completion_date)],
        }
      }
    })

    if (!habit) {
      return res.status(404).json({ error: 'Habit not found' })
    }

    const allEntries = habit.entries;
    const total_completions = allEntries.length;
    
    let current_streak = 0;
    let longest_streak = 0;
    let completion_percentage = 0.0;
    
    if (total_completions > 0) {
      const entryDates = new Set(allEntries.map(e => {
        const d = new Date(e.completion_date);
        return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      }));

      // Calculate current streak
      let currentCheckDate = new Date();
      currentCheckDate.setHours(0,0,0,0);
      
      let streakActive = true;
      let checkDateStr = `${currentCheckDate.getFullYear()}-${currentCheckDate.getMonth() + 1}-${currentCheckDate.getDate()}`;
      
      // If not completed today, check yesterday
      if (!entryDates.has(checkDateStr)) {
        currentCheckDate.setDate(currentCheckDate.getDate() - 1);
        checkDateStr = `${currentCheckDate.getFullYear()}-${currentCheckDate.getMonth() + 1}-${currentCheckDate.getDate()}`;
      }

      while (streakActive) {
        if (entryDates.has(checkDateStr)) {
          current_streak++;
          currentCheckDate.setDate(currentCheckDate.getDate() - 1);
          checkDateStr = `${currentCheckDate.getFullYear()}-${currentCheckDate.getMonth() + 1}-${currentCheckDate.getDate()}`;
        } else {
          streakActive = false;
        }
      }

      // Calculate longest streak
      let temp_streak = 0;
      let previous_date: Date | null = null;
      const ascendingEntries = [...allEntries].reverse();
      
      for (const entry of ascendingEntries) {
        const entryDate = new Date(entry.completion_date);
        entryDate.setHours(0,0,0,0);
        
        if (!previous_date) {
          temp_streak = 1;
        } else {
          const diffTime = Math.abs(entryDate.getTime() - previous_date.getTime());
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays === 1) {
            temp_streak++;
          } else if (diffDays > 1) {
            temp_streak = 1;
          }
        }
        
        if (temp_streak > longest_streak) {
          longest_streak = temp_streak;
        }
        previous_date = entryDate;
      }
    }

    // Calculate completion percentage
    const createdDate = new Date(habit.createdAt);
    createdDate.setHours(0,0,0,0);
    const todayDate = new Date();
    todayDate.setHours(0,0,0,0);
    
    // at least 1 day
    const daysSinceCreation = Math.max(1, Math.round((todayDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)));
    
    let expectedCompletions = 1;
    if (habit.frequency === 'daily') {
      expectedCompletions = daysSinceCreation * (habit.targetCount || 1);
    } else if (habit.frequency === 'weekly') {
      expectedCompletions = Math.max(1, Math.ceil(daysSinceCreation / 7)) * (habit.targetCount || 1);
    } else if (habit.frequency === 'monthly') {
      expectedCompletions = Math.max(1, Math.ceil(daysSinceCreation / 30)) * (habit.targetCount || 1);
    }

    completion_percentage = (total_completions / expectedCompletions) * 100;
    if (completion_percentage > 100) completion_percentage = 100;

    res.json({
      name: habit.name,
      current_streak,
      longest_streak,
      total_completions,
      completion_percentage: parseFloat(completion_percentage.toFixed(1))
    })
  } catch (error) {
    console.error('Get habit stats error:', error)
    res.status(500).json({ error: 'Failed to fetch habit stats' })
  }
}