// Application-wide type definitions

export type UserRole = 'student' | 'mentor' | 'admin';
export type MemberRole = 'student' | 'mentor';
export type FlagSeverity = 'low' | 'medium' | 'high' | 'critical';
export type FlagStatus = 'open' | 'acknowledged' | 'resolved' | 'dismissed';
export type IntegrationStatus = 'not_configured' | 'connected' | 'synchronizing' | 'healthy' | 'stale' | 'degraded' | 'disconnected' | 'permission_required';

export interface DashboardStats {
  activeCourses: number;
  activeTeams: number;
  totalStudents: number;
  teamsNeedingAttention: number;
  openFlags: number;
  resolvedFlags: number;
  checkinCompletionRate: number;
  integrationHealth: 'healthy' | 'degraded' | 'disconnected';
  lastSyncAt: string | null;
}

export interface TeamOverview {
  id: string;
  name: string;
  projectName: string | null;
  memberCount: number;
  repoName: string | null;
  recentActivityCount: number;
  lastActivityAt: string | null;
  checkinCompletion: number;
  openFlags: number;
  integrationStatus: IntegrationStatus;
}

export interface ActivityEvent {
  id: string;
  activityType: string;
  actorGithubLogin: string | null;
  prNumber: number | null;
  issueNumber: number | null;
  eventTimestamp: string;
  isBot: boolean;
  isAttributed: boolean;
}

export interface DailyMetric {
  date: string;
  totalEvents: number;
  prsOpened: number;
  prsMerged: number;
  reviewsSubmitted: number;
  issuesOpened: number;
  uniqueContributors: number;
}

export interface RiskFlag {
  id: string;
  teamId: string;
  teamName: string;
  courseId: string;
  category: string;
  severity: FlagSeverity;
  status: FlagStatus;
  title: string;
  explanation: string;
  ruleId: string;
  ruleVersion: string;
  evidence: Record<string, unknown>;
  dataCoverage: string | null;
  observationStart: string;
  observationEnd: string;
  detectedAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolutionHistory: ResolutionEntry[];
}

export interface ResolutionEntry {
  id: string;
  action: string;
  note: string;
  performedBy: string;
  performedAt: string;
}

export interface Checkin {
  id: string;
  teamId: string;
  userId: string;
  userName: string;
  weekStart: string;
  completedWork: string;
  isBlocked: boolean;
  blockerDescription: string | null;
  confidenceLevel: number;
  submittedAt: string;
}

export interface ContributionBreakdown {
  githubLogin: string;
  displayName: string | null;
  totalEvents: number;
  percentage: number;
  isBot: boolean;
  isAttributed: boolean;
}

export interface DemoTeam {
  id: string;
  name: string;
  projectName: string;
  courseName: string;
  members: DemoMember[];
  metrics: DailyMetric[];
  checkins: DemoCheckin[];
  flags: DemoFlag[];
  contributionBreakdown: ContributionBreakdown[];
  integrationStatus: IntegrationStatus;
  lastActivityAt: string;
  repoName: string;
}

export interface DemoMember {
  name: string;
  githubLogin: string;
  avatarUrl: string;
}

export interface DemoCheckin {
  memberName: string;
  weekStart: string;
  completedWork: string;
  isBlocked: boolean;
  blockerDescription: string | null;
  confidenceLevel: number;
  submittedAt: string;
}

export interface DemoFlag {
  id: string;
  category: string;
  severity: FlagSeverity;
  status: FlagStatus;
  title: string;
  explanation: string;
  ruleId: string;
  evidence: Record<string, unknown>;
  dataCoverage: string;
  observationStart: string;
  observationEnd: string;
  detectedAt: string;
}
