import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ClassValue } from 'clsx'
import { env } from '@/env'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const createPublicFileKey = (key: string) => {
  return `${env.VITE_BASE_FRONTEND_URL}/api/files/${key}`
}
