import type { Response } from 'express'
import type { AuthenticationRequest } from '../middleware/auth.ts'
import { db } from '../db/connection.ts'
import { users } from '../db/schema.ts'
import { eq } from 'drizzle-orm'
import { hashPassword, comparePassword } from '../utils/password.ts'

// GET PROFILE — GET /api/users/profile
// Pattern: Selective column query (exclude password)
export const getProfile = async (req: AuthenticationRequest, res: Response) => {
  try {
    const userId = req.user!.id

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, userId))

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({ user })
  } catch (error) {
    console.error('Get profile error:', error)
    res.status(500).json({ error: 'Failed to fetch profile' })
  }
}

// UPDATE PROFILE — PUT /api/users/profile
// Pattern: Partial update with .returning() for selective columns
export const updateProfile = async (req: AuthenticationRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { email, username, firstName, lastName } = req.body

    const [updatedUser] = await db
      .update(users)
      .set({
        email,
        username,
        firstName,
        lastName,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        email: users.email,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        updatedAt: users.updatedAt,
      })

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser,
    })
  } catch (error) {
    console.error('Update profile error:', error)
    res.status(500).json({ error: 'Failed to update profile' })
  }
}

// CHANGE PASSWORD — POST /api/users/change-password
// Pattern: Verify old → hash new → update (3-step security flow)
export const changePassword = async (req: AuthenticationRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { currentPassword, newPassword } = req.body

    const [user] = await db.select().from(users).where(eq(users.id, userId))

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const isValidPassword = await comparePassword(currentPassword, user.password)

    if (!isValidPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' })
    }

    const hashedPassword = await hashPassword(newPassword)

    await db
      .update(users)
      .set({
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))

    res.json({
      message: 'Password changed successfully',
    })
  } catch (error) {
    console.error('Change password error:', error)
    res.status(500).json({ error: 'Failed to change password' })
  }
}
