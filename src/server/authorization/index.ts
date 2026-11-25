// Centralized authorization policy — server-only
// Every protected operation must pass through this module
import 'server-only';

import { db } from '@/server/db';
import { profiles, courseMembers, teamMembers, teams } from '@/server/db/schema';
import { eq, and } from 'drizzle-orm';

export type UserRole = 'student' | 'mentor' | 'admin';
export type Action =
  | 'course:create' | 'course:read' | 'course:update' | 'course:delete' | 'course:archive'
  | 'course:manage_members' | 'course:import_roster' | 'course:export'
  | 'team:create' | 'team:read' | 'team:update' | 'team:delete'
  | 'team:manage_members' | 'team:link_repo' | 'team:unlink_repo'
  | 'checkin:submit' | 'checkin:read_own' | 'checkin:read_team' | 'checkin:read_all'
  | 'flag:read' | 'flag:resolve'
  | 'metrics:read' | 'activity:read'
  | 'invitation:create' | 'invitation:revoke'
  | 'user:manage' | 'user:provision_mentor'
  | 'admin:dashboard' | 'admin:audit' | 'admin:config'
  | 'consent:read' | 'consent:update' | 'consent:delete_data';

export interface AuthUser {
  id: string;
  role: UserRole;
  profileId: string;
}

export interface AuthorizationResult {
  allowed: boolean;
  reason?: string;
}

// Get user profile with role
export async function getUserProfile(userId: string): Promise<AuthUser | null> {
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.userId, userId),
  });

  if (!profile || !profile.isActive) return null;

  return {
    id: userId,
    role: profile.role,
    profileId: profile.id,
  };
}

// Check course membership
export async function isCourseMember(
  userId: string,
  courseId: string,
  requiredRole?: 'student' | 'mentor'
): Promise<boolean> {
  const member = await db.query.courseMembers.findFirst({
    where: and(
      eq(courseMembers.courseId, courseId),
      eq(courseMembers.userId, userId),
      ...(requiredRole ? [eq(courseMembers.role, requiredRole)] : [])
    ),
  });
  return !!member;
}

// Check team membership
export async function isTeamMember(
  userId: string,
  teamId: string,
  requiredRole?: 'student' | 'mentor'
): Promise<boolean> {
  const member = await db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.userId, userId),
      ...(requiredRole ? [eq(teamMembers.role, requiredRole)] : [])
    ),
  });
  return !!member;
}

// Check if user is a mentor for the course that owns this team
export async function isTeamMentor(
  userId: string,
  teamId: string
): Promise<boolean> {
  const team = await db.query.teams.findFirst({
    where: eq(teams.id, teamId),
  });
  if (!team) return false;
  return isCourseMember(userId, team.courseId, 'mentor');
}

// Central authorization function
export async function can(
  user: AuthUser,
  action: Action,
  resourceContext?: { courseId?: string; teamId?: string; userId?: string }
): Promise<AuthorizationResult> {
  const deny = (reason: string): AuthorizationResult => ({ allowed: false, reason });
  const allow = (): AuthorizationResult => ({ allowed: true });

  // Admin actions
  if (action.startsWith('admin:')) {
    if (user.role !== 'admin') return deny('Administrator access required');
    return allow();
  }

  if (action === 'user:manage' || action === 'user:provision_mentor') {
    if (user.role !== 'admin') return deny('Administrator access required');
    return allow();
  }

  // Course actions
  if (action === 'course:create') {
    if (user.role !== 'mentor' && user.role !== 'admin') return deny('Only mentors can create courses');
    return allow();
  }

  if (action === 'course:read' && resourceContext?.courseId) {
    if (user.role === 'admin') return allow();
    const isMember = await isCourseMember(user.id, resourceContext.courseId);
    if (!isMember) return deny('Not a member of this course');
    return allow();
  }

  if ((action === 'course:update' || action === 'course:archive' ||
       action === 'course:manage_members' || action === 'course:import_roster' ||
       action === 'course:export') && resourceContext?.courseId) {
    if (user.role === 'admin') return allow();
    const isMentor = await isCourseMember(user.id, resourceContext.courseId, 'mentor');
    if (!isMentor) return deny('Only course mentors can perform this action');
    return allow();
  }

  // Team actions
  if (action === 'team:create' && resourceContext?.courseId) {
    if (user.role === 'admin') return allow();
    const isMentor = await isCourseMember(user.id, resourceContext.courseId, 'mentor');
    if (!isMentor) return deny('Only course mentors can create teams');
    return allow();
  }

  if (action === 'team:read' && resourceContext?.teamId) {
    if (user.role === 'admin') return allow();
    const isMember = await isTeamMember(user.id, resourceContext.teamId);
    if (isMember) return allow();
    // Also allow course mentors
    const mentorAccess = await isTeamMentor(user.id, resourceContext.teamId);
    if (mentorAccess) return allow();
    return deny('Not a member of this team');
  }

  if ((action === 'team:update' || action === 'team:manage_members' ||
       action === 'team:link_repo' || action === 'team:unlink_repo') && resourceContext?.teamId) {
    if (user.role === 'admin') return allow();
    const mentorAccess = await isTeamMentor(user.id, resourceContext.teamId);
    if (!mentorAccess) return deny('Only team mentors can perform this action');
    return allow();
  }

  // Check-in actions
  if (action === 'checkin:submit' && resourceContext?.teamId) {
    const isMember = await isTeamMember(user.id, resourceContext.teamId, 'student');
    if (!isMember) return deny('Only team students can submit check-ins');
    return allow();
  }

  if (action === 'checkin:read_own') {
    return allow(); // Users can always read their own check-ins
  }

  if (action === 'checkin:read_team' && resourceContext?.teamId) {
    if (user.role === 'admin') return allow();
    const mentorAccess = await isTeamMentor(user.id, resourceContext.teamId);
    if (mentorAccess) return allow();
    return deny('Only mentors can read team check-ins');
  }

  // Flag actions
  if (action === 'flag:read' && resourceContext?.courseId) {
    if (user.role === 'admin') return allow();
    const isMember = await isCourseMember(user.id, resourceContext.courseId);
    if (!isMember) return deny('Not a member of this course');
    return allow();
  }

  if (action === 'flag:resolve' && resourceContext?.courseId) {
    if (user.role === 'admin') return allow();
    const isMentor = await isCourseMember(user.id, resourceContext.courseId, 'mentor');
    if (!isMentor) return deny('Only mentors can resolve flags');
    return allow();
  }

  // Metrics and activity
  if ((action === 'metrics:read' || action === 'activity:read') && resourceContext?.teamId) {
    if (user.role === 'admin') return allow();
    const isMember = await isTeamMember(user.id, resourceContext.teamId);
    if (isMember) return allow();
    const mentorAccess = await isTeamMentor(user.id, resourceContext.teamId);
    if (mentorAccess) return allow();
    return deny('Not authorized to view this team\'s data');
  }

  // Invitation actions
  if (action === 'invitation:create' && resourceContext?.courseId) {
    if (user.role === 'admin') return allow();
    const isMentor = await isCourseMember(user.id, resourceContext.courseId, 'mentor');
    if (!isMentor) return deny('Only mentors can create invitations');
    return allow();
  }

  // Consent actions (users can manage their own consent)
  if (action === 'consent:read' || action === 'consent:update' || action === 'consent:delete_data') {
    // Users can only manage their own consent
    if (resourceContext?.userId && resourceContext.userId !== user.id) {
      if (user.role !== 'admin') return deny('Cannot manage other users\' consent');
    }
    return allow();
  }

  return deny(`Unknown action: ${action}`);
}

// Helper to enforce authorization (throws on denial)
export async function enforce(
  user: AuthUser,
  action: Action,
  resourceContext?: { courseId?: string; teamId?: string; userId?: string }
): Promise<void> {
  const result = await can(user, action, resourceContext);
  if (!result.allowed) {
    throw new AuthorizationError(result.reason || 'Access denied');
  }
}

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}
