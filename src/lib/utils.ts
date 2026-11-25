// Shared utility functions
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const target = new Date(date);
  const diffMs = now.getTime() - target.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
}

export function getWeekStart(date: Date, timezone: string = 'UTC'): Date {
  // Determine calendar date in course timezone, then compute Monday 00:00:00Z
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = Number(parts.find((p) => p.type === 'year')?.value ?? date.getUTCFullYear());
  const month = Number(parts.find((p) => p.type === 'month')?.value ?? date.getUTCMonth() + 1) - 1;
  const dayNum = Number(parts.find((p) => p.type === 'day')?.value ?? date.getUTCDate());

  const localUtc = new Date(Date.UTC(year, month, dayNum));
  const day = localUtc.getUTCDay();
  const diff = dayNum - day + (day === 0 ? -6 : 1);
  return new Date(Date.UTC(year, month, diff, 0, 0, 0, 0));
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '…';
}

// Sanitize CSV cell values to prevent formula injection
export function sanitizeCsvCell(value: string): string {
  const dangerous = ['=', '+', '-', '@', '\t', '\r', '\n'];
  if (dangerous.some(c => value.startsWith(c))) {
    return `'${value}`;
  }
  // Escape double quotes
  if (value.includes('"') || value.includes(',')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// Generate a cryptographically secure random token
export async function generateSecureToken(bytes: number = 32): Promise<string> {
  const { randomBytes } = await import('crypto');
  return new Promise((resolve, reject) => {
    randomBytes(bytes, (err, buf) => {
      if (err) reject(err);
      else resolve(buf.toString('base64url'));
    });
  });
}

// Hash a token for secure storage
export async function hashToken(token: string): Promise<string> {
  const { createHash } = await import('crypto');
  return createHash('sha256').update(token).digest('hex');
}
