// Database Schema for TeamTrail
// All tables use UTC timestamps, server-only module
import 'server-only';

import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  varchar,
  pgEnum,
  uniqueIndex,
  index,
  jsonb,
  bigint,
  check,
  uuid,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// ── Enums ──────────────────────────────────────────────────────

export const userRoleEnum = pgEnum('user_role', ['student', 'mentor', 'admin']);
export const memberRoleEnum = pgEnum('member_role', ['student', 'mentor']);
export const flagSeverityEnum = pgEnum('flag_severity', ['low', 'medium', 'high', 'critical']);
export const flagStatusEnum = pgEnum('flag_status', ['open', 'acknowledged', 'resolved', 'dismissed']);
export const jobStatusEnum = pgEnum('job_status', ['pending', 'claimed', 'running', 'completed', 'failed', 'dead']);
export const integrationStatusEnum = pgEnum('integration_status', [
  'not_configured', 'connected', 'synchronizing', 'healthy', 'stale', 'degraded', 'disconnected', 'permission_required'
]);
export const consentTypeEnum = pgEnum('consent_type', ['activity_collection', 'checkin_visibility', 'metrics_sharing']);
export const invitationStatusEnum = pgEnum('invitation_status', ['active', 'redeemed', 'expired', 'revoked']);
export const deletionStatusEnum = pgEnum('deletion_status', ['requested', 'processing', 'completed', 'failed']);
export const webhookEventTypeEnum = pgEnum('webhook_event_type', [
  'pull_request', 'pull_request_review', 'pull_request_review_comment',
  'issues', 'issue_comment', 'installation', 'installation_repositories'
]);
export const activityTypeEnum = pgEnum('activity_type', [
  'pr_opened', 'pr_merged', 'pr_closed', 'pr_review_submitted',
  'pr_review_comment', 'issue_opened', 'issue_closed', 'issue_comment'
]);

// ── Better Auth tables ─────────────────────────────────────────
// These are managed by better-auth but we define them for Drizzle awareness

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
});

export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const verifications = pgTable('verifications', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
});

// ── Application Tables ─────────────────────────────────────────

export const profiles = pgTable('profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  role: userRoleEnum('role').notNull().default('student'),
  githubUserId: bigint('github_user_id', { mode: 'number' }),
  githubUsername: varchar('github_username', { length: 39 }),
  displayName: varchar('display_name', { length: 100 }),
  avatarUrl: text('avatar_url'),
  isActive: boolean('is_active').notNull().default(true),
  onboardedAt: timestamp('onboarded_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('profiles_github_user_id_idx').on(table.githubUserId),
  index('profiles_role_idx').on(table.role),
]);

export const courses = pgTable('courses', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  code: varchar('code', { length: 50 }),
  description: text('description'),
  term: varchar('term', { length: 50 }),
  timezone: varchar('timezone', { length: 50 }).notNull().default('UTC'),
  checkinDayOfWeek: integer('checkin_day_of_week').notNull().default(5), // Friday
  checkinDeadlineHour: integer('checkin_deadline_hour').notNull().default(23),
  isArchived: boolean('is_archived').notNull().default(false),
  createdById: text('created_by_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const courseMembers = pgTable('course_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  courseId: uuid('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: memberRoleEnum('role').notNull(),
  joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('course_members_unique_idx').on(table.courseId, table.userId),
  index('course_members_user_idx').on(table.userId),
]);

export const teams = pgTable('teams', {
  id: uuid('id').defaultRandom().primaryKey(),
  courseId: uuid('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  projectName: varchar('project_name', { length: 200 }),
  isArchived: boolean('is_archived').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('teams_course_idx').on(table.courseId),
]);

export const teamMembers = pgTable('team_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: memberRoleEnum('role').notNull().default('student'),
  githubUserId: bigint('github_user_id', { mode: 'number' }),
  joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  removedAt: timestamp('removed_at', { withTimezone: true }),
}, (table) => [
  uniqueIndex('team_members_unique_idx').on(table.teamId, table.userId),
  index('team_members_user_idx').on(table.userId),
]);

export const invitations = pgTable('invitations', {
  id: uuid('id').defaultRandom().primaryKey(),
  tokenHash: text('token_hash').notNull().unique(),
  courseId: uuid('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  teamId: uuid('team_id').references(() => teams.id, { onDelete: 'cascade' }),
  role: memberRoleEnum('role').notNull().default('student'),
  email: varchar('email', { length: 320 }),
  maxUses: integer('max_uses').notNull().default(1),
  usedCount: integer('used_count').notNull().default(0),
  status: invitationStatusEnum('status').notNull().default('active'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdById: text('created_by_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const installations = pgTable('installations', {
  id: uuid('id').defaultRandom().primaryKey(),
  githubInstallationId: bigint('github_installation_id', { mode: 'number' }).notNull().unique(),
  githubAccountLogin: varchar('github_account_login', { length: 100 }),
  githubAccountType: varchar('github_account_type', { length: 20 }),
  installedById: text('installed_by_id').references(() => users.id),
  isSuspended: boolean('is_suspended').notNull().default(false),
  permissions: jsonb('permissions'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const repos = pgTable('repos', {
  id: uuid('id').defaultRandom().primaryKey(),
  teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  installationId: uuid('installation_id').notNull().references(() => installations.id),
  githubRepoId: bigint('github_repo_id', { mode: 'number' }).notNull(),
  githubFullName: varchar('github_full_name', { length: 200 }).notNull(),
  defaultBranch: varchar('default_branch', { length: 200 }).default('main'),
  integrationStatus: integrationStatusEnum('integration_status').notNull().default('connected'),
  lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
  syncCursor: text('sync_cursor'),
  linkedById: text('linked_by_id').notNull().references(() => users.id),
  linkedAt: timestamp('linked_at', { withTimezone: true }).notNull().defaultNow(),
  unlinkedAt: timestamp('unlinked_at', { withTimezone: true }),
}, (table) => [
  uniqueIndex('repos_team_github_idx').on(table.teamId, table.githubRepoId),
  index('repos_installation_idx').on(table.installationId),
]);

export const webhookDeliveryReceipts = pgTable('webhook_delivery_receipts', {
  id: uuid('id').defaultRandom().primaryKey(),
  deliveryId: varchar('delivery_id', { length: 100 }).notNull().unique(),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  action: varchar('action', { length: 100 }),
  installationId: bigint('installation_id', { mode: 'number' }),
  repoId: bigint('repo_id', { mode: 'number' }),
  processed: boolean('processed').notNull().default(false),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
});

export const activityEvents = pgTable('activity_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  repoId: uuid('repo_id').notNull().references(() => repos.id, { onDelete: 'cascade' }),
  teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  activityType: activityTypeEnum('activity_type').notNull(),
  githubEventId: varchar('github_event_id', { length: 100 }),
  actorGithubUserId: bigint('actor_github_user_id', { mode: 'number' }),
  actorGithubLogin: varchar('actor_github_login', { length: 39 }),
  teamMemberId: uuid('team_member_id').references(() => teamMembers.id),
  isBot: boolean('is_bot').notNull().default(false),
  isAttributed: boolean('is_attributed').notNull().default(false),
  externalUrl: text('external_url'),
  prNumber: integer('pr_number'),
  issueNumber: integer('issue_number'),
  eventTimestamp: timestamp('event_timestamp', { withTimezone: true }).notNull(),
  metadata: jsonb('metadata'),
  source: varchar('source', { length: 20 }).notNull().default('webhook'), // 'webhook' | 'sync'
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('activity_events_dedup_idx').on(
    table.repoId, table.activityType, table.githubEventId
  ),
  index('activity_events_team_idx').on(table.teamId),
  index('activity_events_timestamp_idx').on(table.eventTimestamp),
  index('activity_events_actor_idx').on(table.actorGithubUserId),
]);

export const dailyMetrics = pgTable('daily_metrics', {
  id: uuid('id').defaultRandom().primaryKey(),
  teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  date: timestamp('date', { withTimezone: true }).notNull(),
  totalEvents: integer('total_events').notNull().default(0),
  prsOpened: integer('prs_opened').notNull().default(0),
  prsMerged: integer('prs_merged').notNull().default(0),
  prsClosed: integer('prs_closed').notNull().default(0),
  reviewsSubmitted: integer('reviews_submitted').notNull().default(0),
  reviewComments: integer('review_comments').notNull().default(0),
  issuesOpened: integer('issues_opened').notNull().default(0),
  issuesClosed: integer('issues_closed').notNull().default(0),
  issueComments: integer('issue_comments').notNull().default(0),
  uniqueContributors: integer('unique_contributors').notNull().default(0),
  contributorBreakdown: jsonb('contributor_breakdown'),
  dataCoverage: varchar('data_coverage', { length: 20 }).notNull().default('full'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('daily_metrics_team_date_idx').on(table.teamId, table.date),
]);

export const checkins = pgTable('checkins', {
  id: uuid('id').defaultRandom().primaryKey(),
  teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  weekStart: timestamp('week_start', { withTimezone: true }).notNull(),
  completedWork: text('completed_work').notNull(),
  isBlocked: boolean('is_blocked').notNull().default(false),
  blockerDescription: text('blocker_description'),
  confidenceLevel: integer('confidence_level').notNull(),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('checkins_unique_idx').on(table.teamId, table.userId, table.weekStart),
  index('checkins_team_week_idx').on(table.teamId, table.weekStart),
  check('confidence_check', sql`${table.confidenceLevel} >= 1 AND ${table.confidenceLevel} <= 5`),
]);

export const flags = pgTable('flags', {
  id: uuid('id').defaultRandom().primaryKey(),
  teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  courseId: uuid('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  category: varchar('category', { length: 100 }).notNull(),
  severity: flagSeverityEnum('severity').notNull(),
  status: flagStatusEnum('status').notNull().default('open'),
  title: text('title').notNull(),
  explanation: text('explanation').notNull(),
  ruleId: varchar('rule_id', { length: 100 }).notNull(),
  ruleVersion: varchar('rule_version', { length: 20 }).notNull().default('1.0'),
  evidence: jsonb('evidence').notNull(),
  dataCoverage: varchar('data_coverage', { length: 200 }),
  observationStart: timestamp('observation_start', { withTimezone: true }).notNull(),
  observationEnd: timestamp('observation_end', { withTimezone: true }).notNull(),
  dedupKey: varchar('dedup_key', { length: 255 }).notNull(),
  detectedAt: timestamp('detected_at', { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  resolvedById: text('resolved_by_id').references(() => users.id),
}, (table) => [
  uniqueIndex('flags_dedup_idx').on(table.dedupKey),
  index('flags_team_idx').on(table.teamId),
  index('flags_course_idx').on(table.courseId),
  index('flags_status_idx').on(table.status),
]);

export const flagResolutionHistory = pgTable('flag_resolution_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  flagId: uuid('flag_id').notNull().references(() => flags.id, { onDelete: 'cascade' }),
  action: varchar('action', { length: 50 }).notNull(),
  note: text('note').notNull(),
  performedById: text('performed_by_id').notNull().references(() => users.id),
  performedAt: timestamp('performed_at', { withTimezone: true }).notNull().defaultNow(),
});

export const consents = pgTable('consents', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  consentType: consentTypeEnum('consent_type').notNull(),
  granted: boolean('granted').notNull(),
  version: integer('version').notNull().default(1),
  grantedAt: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
}, (table) => [
  index('consents_user_idx').on(table.userId),
]);

export const auditLog = pgTable('audit_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id),
  action: varchar('action', { length: 100 }).notNull(),
  resourceType: varchar('resource_type', { length: 50 }).notNull(),
  resourceId: varchar('resource_id', { length: 100 }),
  metadata: jsonb('metadata'),
  ipAddress: varchar('ip_address', { length: 45 }),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('audit_log_user_idx').on(table.userId),
  index('audit_log_action_idx').on(table.action),
  index('audit_log_timestamp_idx').on(table.timestamp),
]);

export const backgroundJobs = pgTable('background_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  queue: varchar('queue', { length: 50 }).notNull(),
  type: varchar('type', { length: 100 }).notNull(),
  payload: jsonb('payload').notNull(),
  status: jobStatusEnum('status').notNull().default('pending'),
  priority: integer('priority').notNull().default(0),
  attempts: integer('attempts').notNull().default(0),
  maxAttempts: integer('max_attempts').notNull().default(3),
  lastError: text('last_error'),
  claimedAt: timestamp('claimed_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  scheduledFor: timestamp('scheduled_for', { withTimezone: true }).notNull().defaultNow(),
  leaseExpiresAt: timestamp('lease_expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('background_jobs_queue_status_idx').on(table.queue, table.status),
  index('background_jobs_scheduled_idx').on(table.scheduledFor),
]);

export const rateLimits = pgTable('rate_limits', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: varchar('key', { length: 255 }).notNull(),
  windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
  count: integer('count').notNull().default(1),
  limit: integer('limit_value').notNull(),
}, (table) => [
  uniqueIndex('rate_limits_key_window_idx').on(table.key, table.windowStart),
]);

export const dataDeletionRequests = pgTable('data_deletion_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  status: deletionStatusEnum('status').notNull().default('requested'),
  reason: text('reason'),
  requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});

// ── Relations ──────────────────────────────────────────────────

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, { fields: [profiles.userId], references: [users.id] }),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  createdBy: one(users, { fields: [courses.createdById], references: [users.id] }),
  members: many(courseMembers),
  teams: many(teams),
  flags: many(flags),
}));

export const courseMembersRelations = relations(courseMembers, ({ one }) => ({
  course: one(courses, { fields: [courseMembers.courseId], references: [courses.id] }),
  user: one(users, { fields: [courseMembers.userId], references: [users.id] }),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  course: one(courses, { fields: [teams.courseId], references: [courses.id] }),
  members: many(teamMembers),
  repos: many(repos),
  activityEvents: many(activityEvents),
  dailyMetrics: many(dailyMetrics),
  checkins: many(checkins),
  flags: many(flags),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, { fields: [teamMembers.teamId], references: [teams.id] }),
  user: one(users, { fields: [teamMembers.userId], references: [users.id] }),
}));

export const reposRelations = relations(repos, ({ one, many }) => ({
  team: one(teams, { fields: [repos.teamId], references: [teams.id] }),
  installation: one(installations, { fields: [repos.installationId], references: [installations.id] }),
  activityEvents: many(activityEvents),
}));

export const flagsRelations = relations(flags, ({ one, many }) => ({
  team: one(teams, { fields: [flags.teamId], references: [teams.id] }),
  course: one(courses, { fields: [flags.courseId], references: [courses.id] }),
  resolvedBy: one(users, { fields: [flags.resolvedById], references: [users.id] }),
  resolutionHistory: many(flagResolutionHistory),
}));

export const flagResolutionHistoryRelations = relations(flagResolutionHistory, ({ one }) => ({
  flag: one(flags, { fields: [flagResolutionHistory.flagId], references: [flags.id] }),
  performedBy: one(users, { fields: [flagResolutionHistory.performedById], references: [users.id] }),
}));

export const checkinsRelations = relations(checkins, ({ one }) => ({
  team: one(teams, { fields: [checkins.teamId], references: [teams.id] }),
  user: one(users, { fields: [checkins.userId], references: [users.id] }),
}));
