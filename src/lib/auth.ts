import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { NextRequest } from 'next/server'

const JWT_SECRET = process.env.JWT_SECRET || 'hydroponic-secret-key'

export interface JWTPayload {
  userId: string
  email: string
  role: string
  name: string
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  } catch {
    return null
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }
  const cookie = request.cookies.get('token')
  return cookie?.value || null
}

export function getUserFromRequest(request: NextRequest): JWTPayload | null {
  const token = getTokenFromRequest(request)
  if (!token) return null
  return verifyToken(token)
}
