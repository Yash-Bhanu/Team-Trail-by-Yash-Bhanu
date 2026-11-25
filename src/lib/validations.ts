// Zod validation schemas for all API inputs
import { z } from 'zod';

// ── Course schemas ─────────────────────────────────────────

export const createCourseSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  code: z.string().max(50).trim().optional(),
  description: z.string().max(2000).trim().optional(),
  term: z.string().max(50).trim().optional(),
  timezone: z.string().max(50).default('UTC'),
  checkinDayOfWeek: z.number().int().min(0).max(6).default(5),
  checkinDeadlineHour: z.number().int().min(0).max(23).default(23),
});

export const updateCourseSchema = createCourseSchema.partial();

// ── Team schemas ───────────────────────────────────────────

export const createTeamSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  description: z.string().max(2000).trim().optional(),
  projectName: z.string().max(200).trim().optional(),
  courseId: z.string().uuid(),
});

export const updateTeamSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(2000).trim().optional(),
  projectName: z.string().max(200).trim().optional(),
});

// ── Check-in schemas ───────────────────────────────────────

export const checkinSchema = z.object({
  completedWork: z.string().min(1, 'Please describe what you completed').max(2000).trim(),
  isBlocked: z.boolean(),
  blockerDescription: z.string().max(1000).trim().optional().nullable(),
  confidenceLevel: z.number().int().min(1).max(5),
});

// ── Invitation schemas ─────────────────────────────────────

export const createInvitationSchema = z.object({
  courseId: z.string().uuid(),
  teamId: z.string().uuid().optional(),
  role: z.enum(['student', 'mentor']).default('student'),
  email: z.string().email().max(320).optional(),
  maxUses: z.number().int().min(1).max(100).default(1),
  expiresInDays: z.number().int().min(1).max(30).default(7),
});

export const redeemInvitationSchema = z.object({
  token: z.string().min(1).max(100),
});

// ── Flag resolution schemas ────────────────────────────────

export const resolveFlagSchema = z.object({
  action: z.enum(['resolved', 'acknowledged', 'dismissed']),
  note: z.string().min(1, 'Resolution note is required').max(2000).trim(),
});

// ── CSV Import schemas ─────────────────────────────────────

export const csvRosterRowSchema = z.object({
  email: z.string().email().max(320),
  name: z.string().min(1).max(100).trim(),
  teamName: z.string().min(1).max(200).trim().optional(),
  role: z.enum(['student', 'mentor']).default('student'),
});

// ── Consent schemas ────────────────────────────────────────

export const updateConsentSchema = z.object({
  consentType: z.enum(['activity_collection', 'checkin_visibility', 'metrics_sharing']),
  granted: z.boolean(),
});

// ── Repository linking schemas ─────────────────────────────

export const linkRepoSchema = z.object({
  installationId: z.number().int().positive(),
  githubRepoId: z.number().int().positive(),
  githubFullName: z.string().min(1).max(200),
  defaultBranch: z.string().max(200).default('main'),
});

// ── Pagination schemas ─────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().max(50).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ── Search/filter schemas ──────────────────────────────────

export const teamFilterSchema = z.object({
  search: z.string().max(200).trim().optional(),
  hasFlags: z.coerce.boolean().optional(),
  status: z.enum(['active', 'archived', 'all']).default('active'),
}).merge(paginationSchema);

// ── Date range schema ──────────────────────────────────────

export const dateRangeSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return data.startDate <= data.endDate;
    }
    return true;
  },
  { message: 'Start date must be before end date' }
);

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
export type CheckinInput = z.infer<typeof checkinSchema>;
export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
export type RedeemInvitationInput = z.infer<typeof redeemInvitationSchema>;
export type ResolveFlagInput = z.infer<typeof resolveFlagSchema>;
export type LinkRepoInput = z.infer<typeof linkRepoSchema>;
export type UpdateConsentInput = z.infer<typeof updateConsentSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type TeamFilterInput = z.infer<typeof teamFilterSchema>;
