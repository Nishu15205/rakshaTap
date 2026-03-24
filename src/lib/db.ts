// Database client - completely optional for Vercel demo mode
// Works without any database connection

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Check if DATABASE_URL is available
const databaseUrl = process.env.DATABASE_URL

// Only create Prisma client if DATABASE_URL exists and is valid
let prismaClient: PrismaClient | null = null

try {
  if (databaseUrl && databaseUrl.includes('postgresql://')) {
    prismaClient = globalForPrisma.prisma ?? new PrismaClient({
      log: [],
    })
    if (process.env.NODE_ENV !== 'production') {
      globalForPrisma.prisma = prismaClient
    }
  }
} catch (error) {
  console.log('Prisma client not initialized - using demo mode')
  prismaClient = null
}

export const db = prismaClient

// Helper to check if database is available
export function isDatabaseAvailable(): boolean {
  return db !== null
}

// Safe database operation wrapper
export async function safeDbOperation<T>(
  operation: (db: PrismaClient) => Promise<T>,
  fallback: T
): Promise<T> {
  if (!db) {
    return fallback
  }

  try {
    return await operation(db)
  } catch (error) {
    console.error('Database operation failed:', error)
    return fallback
  }
}
