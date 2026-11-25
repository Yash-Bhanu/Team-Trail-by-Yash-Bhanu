// Synthetic demo data fixtures — completely isolated from production
// All names, teams, and data are fictional

import type { DemoTeam, DailyMetric, FlagSeverity } from '@/types';

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function weekStart(weeksAgo: number): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) - (weeksAgo * 7);
  const ws = new Date(d.setDate(diff));
  ws.setHours(0, 0, 0, 0);
  return ws.toISOString();
}

function generateMetrics(weeksBack: number, baseActivity: number, trend: 'stable' | 'declining' | 'growing'): DailyMetric[] {
  const metrics: DailyMetric[] = [];
  for (let i = weeksBack * 7; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const trendMultiplier = trend === 'declining' ? Math.max(0.1, 1 - (weeksBack * 7 - i) / (weeksBack * 14))
      : trend === 'growing' ? Math.min(2, 0.5 + (weeksBack * 7 - i) / (weeksBack * 14))
      : 1;
    const dayOfWeek = d.getDay();
    const weekendMultiplier = dayOfWeek === 0 || dayOfWeek === 6 ? 0.3 : 1;
    const noise = 0.5 + Math.random();
    const events = Math.round(baseActivity * trendMultiplier * weekendMultiplier * noise);

    metrics.push({
      date: d.toISOString().split('T')[0]!,
      totalEvents: events,
      prsOpened: Math.round(events * 0.15),
      prsMerged: Math.round(events * 0.12),
      reviewsSubmitted: Math.round(events * 0.2),
      issuesOpened: Math.round(events * 0.1),
      uniqueContributors: Math.min(4, Math.max(1, Math.round(events / 3))),
    });
  }
  return metrics;
}

// ── Fictional Teams ────────────────────────────────────────

export const DEMO_TEAMS: DemoTeam[] = [
  {
    id: 'demo-team-01',
    name: 'Team Nebula',
    projectName: 'CloudNote — Collaborative Study Notes',
    courseName: 'CS 4400 — Software Engineering',
    repoName: 'cs4400-team-nebula/cloudnote',
    integrationStatus: 'healthy',
    lastActivityAt: daysAgo(0),
    members: [
      { name: 'Aria Chen', githubLogin: 'ariachen', avatarUrl: '' },
      { name: 'Ben Torres', githubLogin: 'bentorres', avatarUrl: '' },
      { name: 'Clara Kim', githubLogin: 'clarakim', avatarUrl: '' },
      { name: 'David Osei', githubLogin: 'davidosei', avatarUrl: '' },
    ],
    metrics: generateMetrics(4, 8, 'stable'),
    contributionBreakdown: [
      { githubLogin: 'ariachen', displayName: 'Aria Chen', totalEvents: 32, percentage: 28, isBot: false, isAttributed: true },
      { githubLogin: 'bentorres', displayName: 'Ben Torres', totalEvents: 28, percentage: 25, isBot: false, isAttributed: true },
      { githubLogin: 'clarakim', displayName: 'Clara Kim', totalEvents: 30, percentage: 26, isBot: false, isAttributed: true },
      { githubLogin: 'davidosei', displayName: 'David Osei', totalEvents: 24, percentage: 21, isBot: false, isAttributed: true },
    ],
    checkins: [
      { memberName: 'Aria Chen', weekStart: weekStart(0), completedWork: 'Implemented note sharing feature with real-time sync', isBlocked: false, blockerDescription: null, confidenceLevel: 4, submittedAt: daysAgo(1) },
      { memberName: 'Ben Torres', weekStart: weekStart(0), completedWork: 'Set up CI pipeline and wrote integration tests', isBlocked: false, blockerDescription: null, confidenceLevel: 5, submittedAt: daysAgo(1) },
      { memberName: 'Clara Kim', weekStart: weekStart(0), completedWork: 'Designed and implemented the markdown editor component', isBlocked: false, blockerDescription: null, confidenceLevel: 4, submittedAt: daysAgo(2) },
      { memberName: 'David Osei', weekStart: weekStart(0), completedWork: 'Working on user authentication and session management', isBlocked: false, blockerDescription: null, confidenceLevel: 4, submittedAt: daysAgo(2) },
    ],
    flags: [],
  },
  {
    id: 'demo-team-02',
    name: 'Team Phoenix',
    projectName: 'MealMap — Campus Dining Finder',
    courseName: 'CS 4400 — Software Engineering',
    repoName: 'cs4400-team-phoenix/mealmap',
    integrationStatus: 'healthy',
    lastActivityAt: daysAgo(1),
    members: [
      { name: 'Elena Vasquez', githubLogin: 'evasquez', avatarUrl: '' },
      { name: 'Finn O\'Brien', githubLogin: 'finnobrien', avatarUrl: '' },
      { name: 'Grace Patel', githubLogin: 'gracepatel', avatarUrl: '' },
    ],
    metrics: generateMetrics(4, 6, 'growing'),
    contributionBreakdown: [
      { githubLogin: 'evasquez', displayName: 'Elena Vasquez', totalEvents: 45, percentage: 60, isBot: false, isAttributed: true },
      { githubLogin: 'finnobrien', displayName: 'Finn O\'Brien', totalEvents: 18, percentage: 24, isBot: false, isAttributed: true },
      { githubLogin: 'gracepatel', displayName: 'Grace Patel', totalEvents: 12, percentage: 16, isBot: false, isAttributed: true },
    ],
    checkins: [
      { memberName: 'Elena Vasquez', weekStart: weekStart(0), completedWork: 'Built the restaurant search API and map integration', isBlocked: false, blockerDescription: null, confidenceLevel: 5, submittedAt: daysAgo(1) },
      { memberName: 'Finn O\'Brien', weekStart: weekStart(0), completedWork: 'Working on the review system and ratings', isBlocked: false, blockerDescription: null, confidenceLevel: 3, submittedAt: daysAgo(2) },
    ],
    flags: [
      {
        id: 'demo-flag-02-1',
        category: 'missing_checkin',
        severity: 'medium' as FlagSeverity,
        status: 'open',
        title: 'Missing Weekly Check-in',
        explanation: '1 of 3 expected check-ins is missing for Team Phoenix this week.',
        ruleId: 'RISK-006',
        evidence: { expectedCheckins: 3, submittedCheckins: 2, missingCount: 1 },
        dataCoverage: 'Based on team membership and check-in records.',
        observationStart: weekStart(0),
        observationEnd: daysAgo(0),
        detectedAt: daysAgo(0),
      },
    ],
  },
  {
    id: 'demo-team-03',
    name: 'Team Orbit',
    projectName: 'StudyBuddy — Peer Tutoring Platform',
    courseName: 'CS 4400 — Software Engineering',
    repoName: 'cs4400-team-orbit/studybuddy',
    integrationStatus: 'healthy',
    lastActivityAt: daysAgo(9),
    members: [
      { name: 'Hana Nakamura', githubLogin: 'hananakamura', avatarUrl: '' },
      { name: 'Ian McCarthy', githubLogin: 'ianmccarthy', avatarUrl: '' },
      { name: 'Julia Santos', githubLogin: 'juliasantos', avatarUrl: '' },
      { name: 'Kevin Park', githubLogin: 'kevinpark', avatarUrl: '' },
    ],
    metrics: generateMetrics(4, 5, 'declining'),
    contributionBreakdown: [
      { githubLogin: 'hananakamura', displayName: 'Hana Nakamura', totalEvents: 8, percentage: 40, isBot: false, isAttributed: true },
      { githubLogin: 'ianmccarthy', displayName: 'Ian McCarthy', totalEvents: 5, percentage: 25, isBot: false, isAttributed: true },
      { githubLogin: 'juliasantos', displayName: 'Julia Santos', totalEvents: 4, percentage: 20, isBot: false, isAttributed: true },
      { githubLogin: 'kevinpark', displayName: 'Kevin Park', totalEvents: 3, percentage: 15, isBot: false, isAttributed: true },
    ],
    checkins: [
      { memberName: 'Hana Nakamura', weekStart: weekStart(0), completedWork: 'Tried to set up the database but ran into issues', isBlocked: true, blockerDescription: 'Cannot connect to the cloud database — getting authentication errors', confidenceLevel: 2, submittedAt: daysAgo(2) },
    ],
    flags: [
      {
        id: 'demo-flag-03-1',
        category: 'team_inactivity',
        severity: 'high' as FlagSeverity,
        status: 'open',
        title: 'Team Inactivity Detected',
        explanation: 'No eligible GitHub activity detected for Team Orbit in the last 7 days.',
        ruleId: 'RISK-001',
        evidence: { daysSinceLastActivity: 9, totalEligibleEvents: 20, observationDays: 7 },
        dataCoverage: 'Coverage: full. Only GitHub activity visible under current permissions is measured.',
        observationStart: daysAgo(7),
        observationEnd: daysAgo(0),
        detectedAt: daysAgo(0),
      },
      {
        id: 'demo-flag-03-2',
        category: 'blocked_student',
        severity: 'high' as FlagSeverity,
        status: 'open',
        title: 'Student Reports Being Blocked',
        explanation: 'A team member in Team Orbit reported being blocked in their weekly check-in.',
        ruleId: 'RISK-005',
        evidence: { blockedStudentName: 'Hana Nakamura', blockerDescriptionProvided: true, totalBlockedThisWeek: 1 },
        dataCoverage: 'Self-reported by student via weekly check-in.',
        observationStart: weekStart(0),
        observationEnd: daysAgo(0),
        detectedAt: daysAgo(0),
      },
      {
        id: 'demo-flag-03-3',
        category: 'missing_checkin',
        severity: 'high' as FlagSeverity,
        status: 'open',
        title: 'Missing Weekly Check-ins',
        explanation: '3 of 4 expected check-ins are missing for Team Orbit this week.',
        ruleId: 'RISK-006',
        evidence: { expectedCheckins: 4, submittedCheckins: 1, missingCount: 3 },
        dataCoverage: 'Based on team membership and check-in records.',
        observationStart: weekStart(0),
        observationEnd: daysAgo(0),
        detectedAt: daysAgo(0),
      },
    ],
  },
  {
    id: 'demo-team-04',
    name: 'Team Catalyst',
    projectName: 'LabTrack — Lab Equipment Scheduler',
    courseName: 'CS 4400 — Software Engineering',
    repoName: 'cs4400-team-catalyst/labtrack',
    integrationStatus: 'healthy',
    lastActivityAt: daysAgo(0),
    members: [
      { name: 'Liam Foster', githubLogin: 'liamfoster', avatarUrl: '' },
      { name: 'Maya Gupta', githubLogin: 'mayagupta', avatarUrl: '' },
      { name: 'Noah Williams', githubLogin: 'noahwilliams', avatarUrl: '' },
    ],
    metrics: generateMetrics(4, 7, 'stable'),
    contributionBreakdown: [
      { githubLogin: 'liamfoster', displayName: 'Liam Foster', totalEvents: 52, percentage: 85, isBot: false, isAttributed: true },
      { githubLogin: 'mayagupta', displayName: 'Maya Gupta', totalEvents: 5, percentage: 8, isBot: false, isAttributed: true },
      { githubLogin: 'noahwilliams', displayName: 'Noah Williams', totalEvents: 4, percentage: 7, isBot: false, isAttributed: true },
    ],
    checkins: [
      { memberName: 'Liam Foster', weekStart: weekStart(0), completedWork: 'Implemented scheduling calendar, booking API, and admin panel', isBlocked: false, blockerDescription: null, confidenceLevel: 5, submittedAt: daysAgo(1) },
      { memberName: 'Maya Gupta', weekStart: weekStart(0), completedWork: 'Wrote some CSS for the landing page', isBlocked: false, blockerDescription: null, confidenceLevel: 3, submittedAt: daysAgo(1) },
      { memberName: 'Noah Williams', weekStart: weekStart(0), completedWork: 'Read the documentation for the lab API', isBlocked: false, blockerDescription: null, confidenceLevel: 2, submittedAt: daysAgo(2) },
    ],
    flags: [
      {
        id: 'demo-flag-04-1',
        category: 'participation_imbalance',
        severity: 'high' as FlagSeverity,
        status: 'open',
        title: 'Uneven Participation Distribution',
        explanation: 'One team member (liamfoster) accounts for 85% of observed eligible GitHub activity in Team Catalyst. This metric measures only GitHub activity and does not represent total student effort.',
        ruleId: 'RISK-003',
        evidence: { topContributorLogin: 'liamfoster', topContributorPercentage: 85, totalEligibleEvents: 61, uniqueContributors: 3 },
        dataCoverage: 'Coverage: full. Observed 61 eligible events from 3 contributors.',
        observationStart: daysAgo(28),
        observationEnd: daysAgo(0),
        detectedAt: daysAgo(0),
      },
    ],
  },
  {
    id: 'demo-team-05',
    name: 'Team Summit',
    projectName: 'CampusRide — Carpool Matching',
    courseName: 'CS 4400 — Software Engineering',
    repoName: 'cs4400-team-summit/campusride',
    integrationStatus: 'healthy',
    lastActivityAt: daysAgo(0),
    members: [
      { name: 'Olivia Chen', githubLogin: 'oliviachen', avatarUrl: '' },
      { name: 'Priya Sharma', githubLogin: 'priyasharma', avatarUrl: '' },
      { name: 'Quinn Reeves', githubLogin: 'quinnreeves', avatarUrl: '' },
      { name: 'Ryan Kowalski', githubLogin: 'ryankowalski', avatarUrl: '' },
    ],
    metrics: generateMetrics(4, 10, 'growing'),
    contributionBreakdown: [
      { githubLogin: 'oliviachen', displayName: 'Olivia Chen', totalEvents: 35, percentage: 30, isBot: false, isAttributed: true },
      { githubLogin: 'priyasharma', displayName: 'Priya Sharma', totalEvents: 28, percentage: 24, isBot: false, isAttributed: true },
      { githubLogin: 'quinnreeves', displayName: 'Quinn Reeves', totalEvents: 30, percentage: 26, isBot: false, isAttributed: true },
      { githubLogin: 'ryankowalski', displayName: 'Ryan Kowalski', totalEvents: 23, percentage: 20, isBot: false, isAttributed: true },
    ],
    checkins: [
      { memberName: 'Olivia Chen', weekStart: weekStart(0), completedWork: 'Built ride matching algorithm and driver profiles', isBlocked: false, blockerDescription: null, confidenceLevel: 5, submittedAt: daysAgo(0) },
      { memberName: 'Priya Sharma', weekStart: weekStart(0), completedWork: 'Implemented notifications and ride history', isBlocked: false, blockerDescription: null, confidenceLevel: 4, submittedAt: daysAgo(1) },
      { memberName: 'Quinn Reeves', weekStart: weekStart(0), completedWork: 'Set up payment integration and security review', isBlocked: false, blockerDescription: null, confidenceLevel: 4, submittedAt: daysAgo(1) },
      { memberName: 'Ryan Kowalski', weekStart: weekStart(0), completedWork: 'Completed mobile-responsive design and accessibility audit', isBlocked: false, blockerDescription: null, confidenceLevel: 5, submittedAt: daysAgo(0) },
    ],
    flags: [],
  },
  {
    id: 'demo-team-06',
    name: 'Team Prism',
    projectName: 'CodeReview — Peer Code Review Tool',
    courseName: 'CS 3200 — Web Development',
    repoName: 'cs3200-team-prism/codereview',
    integrationStatus: 'stale',
    lastActivityAt: daysAgo(3),
    members: [
      { name: 'Sam Rivera', githubLogin: 'samrivera', avatarUrl: '' },
      { name: 'Taylor Kim', githubLogin: 'taylorkim', avatarUrl: '' },
      { name: 'Uma Patel', githubLogin: 'umapatel', avatarUrl: '' },
    ],
    metrics: generateMetrics(4, 4, 'stable'),
    contributionBreakdown: [
      { githubLogin: 'samrivera', displayName: 'Sam Rivera', totalEvents: 20, percentage: 36, isBot: false, isAttributed: true },
      { githubLogin: 'taylorkim', displayName: 'Taylor Kim', totalEvents: 18, percentage: 33, isBot: false, isAttributed: true },
      { githubLogin: 'umapatel', displayName: 'Uma Patel', totalEvents: 17, percentage: 31, isBot: false, isAttributed: true },
    ],
    checkins: [
      { memberName: 'Sam Rivera', weekStart: weekStart(0), completedWork: 'Added diff viewer and inline comments', isBlocked: false, blockerDescription: null, confidenceLevel: 4, submittedAt: daysAgo(1) },
      { memberName: 'Taylor Kim', weekStart: weekStart(0), completedWork: 'Working on the review assignment algorithm', isBlocked: false, blockerDescription: null, confidenceLevel: 4, submittedAt: daysAgo(2) },
      { memberName: 'Uma Patel', weekStart: weekStart(0), completedWork: 'Implemented user profiles and notification preferences', isBlocked: false, blockerDescription: null, confidenceLevel: 3, submittedAt: daysAgo(1) },
    ],
    flags: [
      {
        id: 'demo-flag-06-1',
        category: 'slow_reviews',
        severity: 'medium' as FlagSeverity,
        status: 'open',
        title: 'Slow or Missing Code Reviews',
        explanation: '2 pull requests in Team Prism took more than 48 hours to receive a first review.',
        ruleId: 'RISK-004',
        evidence: { slowReviewCount: 2, unreviewedCount: 0, thresholdHours: 48, totalPRsAnalyzed: 8 },
        dataCoverage: 'Coverage: full. Only reviews visible through GitHub API are measured.',
        observationStart: daysAgo(14),
        observationEnd: daysAgo(0),
        detectedAt: daysAgo(1),
      },
    ],
  },
  {
    id: 'demo-team-07',
    name: 'Team Horizon',
    projectName: 'EventHub — Campus Event Discovery',
    courseName: 'CS 3200 — Web Development',
    repoName: 'cs3200-team-horizon/eventhub',
    integrationStatus: 'healthy',
    lastActivityAt: daysAgo(1),
    members: [
      { name: 'Victor Hernandez', githubLogin: 'victorhernandez', avatarUrl: '' },
      { name: 'Wendy Liu', githubLogin: 'wendyliu', avatarUrl: '' },
      { name: 'Xander Brooks', githubLogin: 'xanderbrooks', avatarUrl: '' },
      { name: 'Yuki Tanaka', githubLogin: 'yukitanaka', avatarUrl: '' },
    ],
    metrics: generateMetrics(4, 9, 'stable'),
    contributionBreakdown: [
      { githubLogin: 'victorhernandez', displayName: 'Victor Hernandez', totalEvents: 28, percentage: 25, isBot: false, isAttributed: true },
      { githubLogin: 'wendyliu', displayName: 'Wendy Liu', totalEvents: 30, percentage: 27, isBot: false, isAttributed: true },
      { githubLogin: 'xanderbrooks', displayName: 'Xander Brooks', totalEvents: 25, percentage: 22, isBot: false, isAttributed: true },
      { githubLogin: 'yukitanaka', displayName: 'Yuki Tanaka', totalEvents: 29, percentage: 26, isBot: false, isAttributed: true },
    ],
    checkins: [
      { memberName: 'Victor Hernandez', weekStart: weekStart(0), completedWork: 'Built event discovery feed with filtering and search', isBlocked: false, blockerDescription: null, confidenceLevel: 5, submittedAt: daysAgo(0) },
      { memberName: 'Wendy Liu', weekStart: weekStart(0), completedWork: 'Implemented RSVP system and attendee management', isBlocked: false, blockerDescription: null, confidenceLevel: 4, submittedAt: daysAgo(1) },
      { memberName: 'Xander Brooks', weekStart: weekStart(0), completedWork: 'Created event creation form and image upload', isBlocked: false, blockerDescription: null, confidenceLevel: 4, submittedAt: daysAgo(1) },
      { memberName: 'Yuki Tanaka', weekStart: weekStart(0), completedWork: 'Set up calendar integration and email notifications', isBlocked: false, blockerDescription: null, confidenceLevel: 5, submittedAt: daysAgo(0) },
    ],
    flags: [],
  },
  {
    id: 'demo-team-08',
    name: 'Team Vertex',
    projectName: 'QuizForge — Interactive Quiz Builder',
    courseName: 'CS 3200 — Web Development',
    repoName: 'cs3200-team-vertex/quizforge',
    integrationStatus: 'disconnected',
    lastActivityAt: daysAgo(14),
    members: [
      { name: 'Zara Ahmed', githubLogin: 'zaraahmed', avatarUrl: '' },
      { name: 'Alex Turner', githubLogin: 'alexturner', avatarUrl: '' },
      { name: 'Beth Collins', githubLogin: 'bethcollins', avatarUrl: '' },
    ],
    metrics: generateMetrics(4, 2, 'declining'),
    contributionBreakdown: [
      { githubLogin: 'zaraahmed', displayName: 'Zara Ahmed', totalEvents: 6, percentage: 50, isBot: false, isAttributed: true },
      { githubLogin: 'alexturner', displayName: 'Alex Turner', totalEvents: 4, percentage: 33, isBot: false, isAttributed: true },
      { githubLogin: 'bethcollins', displayName: 'Beth Collins', totalEvents: 2, percentage: 17, isBot: false, isAttributed: true },
    ],
    checkins: [],
    flags: [
      {
        id: 'demo-flag-08-1',
        category: 'team_inactivity',
        severity: 'critical' as FlagSeverity,
        status: 'open',
        title: 'Team Inactivity Detected',
        explanation: 'No eligible GitHub activity for Team Vertex in the last 14 days. Integration status: disconnected.',
        ruleId: 'RISK-001',
        evidence: { daysSinceLastActivity: 14, totalEligibleEvents: 12, observationDays: 7 },
        dataCoverage: 'Coverage: partial. Integration is disconnected — activity may be occurring outside tracked channels.',
        observationStart: daysAgo(14),
        observationEnd: daysAgo(0),
        detectedAt: daysAgo(0),
      },
      {
        id: 'demo-flag-08-2',
        category: 'no_recent_merges',
        severity: 'medium' as FlagSeverity,
        status: 'open',
        title: 'No Recent Pull Request Merges',
        explanation: 'No PR merges detected for Team Vertex in the last 8 days.',
        ruleId: 'RISK-002',
        evidence: { daysSinceLastMerge: 14, totalMerges: 3, observationDays: 8 },
        dataCoverage: 'Coverage: partial.',
        observationStart: daysAgo(8),
        observationEnd: daysAgo(0),
        detectedAt: daysAgo(0),
      },
      {
        id: 'demo-flag-08-3',
        category: 'missing_checkin',
        severity: 'high' as FlagSeverity,
        status: 'open',
        title: 'Missing Weekly Check-ins',
        explanation: 'All 3 expected check-ins are missing for Team Vertex this week.',
        ruleId: 'RISK-006',
        evidence: { expectedCheckins: 3, submittedCheckins: 0, missingCount: 3 },
        dataCoverage: 'Based on team membership and check-in records.',
        observationStart: weekStart(0),
        observationEnd: daysAgo(0),
        detectedAt: daysAgo(0),
      },
    ],
  },
  {
    id: 'demo-team-09',
    name: 'Team Cipher',
    projectName: 'SecureChat — Encrypted Messaging',
    courseName: 'CS 3200 — Web Development',
    repoName: 'cs3200-team-cipher/securechat',
    integrationStatus: 'healthy',
    lastActivityAt: daysAgo(0),
    members: [
      { name: 'Carlos Mendez', githubLogin: 'carlosmendez', avatarUrl: '' },
      { name: 'Diana Wright', githubLogin: 'dianawright', avatarUrl: '' },
      { name: 'Erik Johansson', githubLogin: 'erikjohansson', avatarUrl: '' },
    ],
    metrics: generateMetrics(4, 6, 'growing'),
    contributionBreakdown: [
      { githubLogin: 'carlosmendez', displayName: 'Carlos Mendez', totalEvents: 25, percentage: 35, isBot: false, isAttributed: true },
      { githubLogin: 'dianawright', displayName: 'Diana Wright', totalEvents: 23, percentage: 32, isBot: false, isAttributed: true },
      { githubLogin: 'erikjohansson', displayName: 'Erik Johansson', totalEvents: 24, percentage: 33, isBot: false, isAttributed: true },
    ],
    checkins: [
      { memberName: 'Carlos Mendez', weekStart: weekStart(0), completedWork: 'Implemented end-to-end encryption using Web Crypto API', isBlocked: false, blockerDescription: null, confidenceLevel: 5, submittedAt: daysAgo(0) },
      { memberName: 'Diana Wright', weekStart: weekStart(0), completedWork: 'Built message history and conversation threads UI', isBlocked: false, blockerDescription: null, confidenceLevel: 4, submittedAt: daysAgo(1) },
      { memberName: 'Erik Johansson', weekStart: weekStart(0), completedWork: 'Implemented user presence indicators and typing status', isBlocked: false, blockerDescription: null, confidenceLevel: 4, submittedAt: daysAgo(1) },
    ],
    flags: [],
  },
  {
    id: 'demo-team-10',
    name: 'Team Atlas',
    projectName: 'GradePath — Degree Progress Tracker',
    courseName: 'Hackathon — HackMIT 2025',
    repoName: 'hackmit-atlas/gradepath',
    integrationStatus: 'healthy',
    lastActivityAt: daysAgo(0),
    members: [
      { name: 'Fatima Al-Rashid', githubLogin: 'fatimarashid', avatarUrl: '' },
      { name: 'George Papadopoulos', githubLogin: 'georgepapad', avatarUrl: '' },
      { name: 'Hannah Fischer', githubLogin: 'hannahfischer', avatarUrl: '' },
      { name: 'Isaac Nguyen', githubLogin: 'isaacnguyen', avatarUrl: '' },
    ],
    metrics: generateMetrics(2, 15, 'growing'),
    contributionBreakdown: [
      { githubLogin: 'fatimarashid', displayName: 'Fatima Al-Rashid', totalEvents: 40, percentage: 27, isBot: false, isAttributed: true },
      { githubLogin: 'georgepapad', displayName: 'George Papadopoulos', totalEvents: 38, percentage: 26, isBot: false, isAttributed: true },
      { githubLogin: 'hannahfischer', displayName: 'Hannah Fischer', totalEvents: 35, percentage: 24, isBot: false, isAttributed: true },
      { githubLogin: 'isaacnguyen', displayName: 'Isaac Nguyen', totalEvents: 33, percentage: 23, isBot: false, isAttributed: true },
    ],
    checkins: [
      { memberName: 'Fatima Al-Rashid', weekStart: weekStart(0), completedWork: 'Built degree audit engine and requirement parser', isBlocked: false, blockerDescription: null, confidenceLevel: 5, submittedAt: daysAgo(0) },
      { memberName: 'George Papadopoulos', weekStart: weekStart(0), completedWork: 'Created interactive course planner with drag-and-drop', isBlocked: false, blockerDescription: null, confidenceLevel: 5, submittedAt: daysAgo(0) },
      { memberName: 'Hannah Fischer', weekStart: weekStart(0), completedWork: 'Designed the visualization for degree progress', isBlocked: false, blockerDescription: null, confidenceLevel: 4, submittedAt: daysAgo(1) },
      { memberName: 'Isaac Nguyen', weekStart: weekStart(0), completedWork: 'Implemented prerequisite chain analysis and warnings', isBlocked: false, blockerDescription: null, confidenceLevel: 5, submittedAt: daysAgo(0) },
    ],
    flags: [],
  },
  {
    id: 'demo-team-11',
    name: 'Team Nova',
    projectName: 'FitConnect — Workout Partner Matching',
    courseName: 'Hackathon — HackMIT 2025',
    repoName: 'hackmit-nova/fitconnect',
    integrationStatus: 'healthy',
    lastActivityAt: daysAgo(2),
    members: [
      { name: 'Jordan Lee', githubLogin: 'jordanlee', avatarUrl: '' },
      { name: 'Kira Petrov', githubLogin: 'kirapetrov', avatarUrl: '' },
      { name: 'Leo Martinez', githubLogin: 'leomartinez', avatarUrl: '' },
    ],
    metrics: generateMetrics(2, 8, 'stable'),
    contributionBreakdown: [
      { githubLogin: 'jordanlee', displayName: 'Jordan Lee', totalEvents: 20, percentage: 33, isBot: false, isAttributed: true },
      { githubLogin: 'kirapetrov', displayName: 'Kira Petrov', totalEvents: 22, percentage: 37, isBot: false, isAttributed: true },
      { githubLogin: 'leomartinez', displayName: 'Leo Martinez', totalEvents: 18, percentage: 30, isBot: false, isAttributed: true },
    ],
    checkins: [
      { memberName: 'Jordan Lee', weekStart: weekStart(0), completedWork: 'Built user matching algorithm based on preferences', isBlocked: false, blockerDescription: null, confidenceLevel: 4, submittedAt: daysAgo(1) },
      { memberName: 'Kira Petrov', weekStart: weekStart(0), completedWork: 'Implemented workout tracking and history views', isBlocked: false, blockerDescription: null, confidenceLevel: 4, submittedAt: daysAgo(1) },
      { memberName: 'Leo Martinez', weekStart: weekStart(0), completedWork: 'Created the schedule coordination system', isBlocked: false, blockerDescription: null, confidenceLevel: 3, submittedAt: daysAgo(2) },
    ],
    flags: [],
  },
  {
    id: 'demo-team-12',
    name: 'Team Spark',
    projectName: 'BugBounce — Gamified Bug Tracking',
    courseName: 'Hackathon — HackMIT 2025',
    repoName: 'hackmit-spark/bugbounce',
    integrationStatus: 'healthy',
    lastActivityAt: daysAgo(0),
    members: [
      { name: 'Mia Richardson', githubLogin: 'miarichardson', avatarUrl: '' },
      { name: 'Nathan Park', githubLogin: 'nathanpark', avatarUrl: '' },
    ],
    metrics: generateMetrics(2, 5, 'stable'),
    contributionBreakdown: [
      { githubLogin: 'miarichardson', displayName: 'Mia Richardson', totalEvents: 18, percentage: 55, isBot: false, isAttributed: true },
      { githubLogin: 'nathanpark', displayName: 'Nathan Park', totalEvents: 15, percentage: 45, isBot: false, isAttributed: true },
    ],
    checkins: [
      { memberName: 'Mia Richardson', weekStart: weekStart(0), completedWork: 'Implemented gamification system with points and badges', isBlocked: false, blockerDescription: null, confidenceLevel: 5, submittedAt: daysAgo(0) },
      { memberName: 'Nathan Park', weekStart: weekStart(0), completedWork: 'Built bug submission and triage workflow', isBlocked: false, blockerDescription: null, confidenceLevel: 4, submittedAt: daysAgo(1) },
    ],
    flags: [],
  },
  {
    id: 'demo-team-13',
    name: 'Team Echo',
    projectName: 'ParkSmart — Smart Parking Finder',
    courseName: 'Hackathon — HackMIT 2025',
    repoName: 'hackmit-echo/parksmart',
    integrationStatus: 'healthy',
    lastActivityAt: daysAgo(1),
    members: [
      { name: 'Olga Ivanova', githubLogin: 'olgaivanova', avatarUrl: '' },
      { name: 'Peter Chang', githubLogin: 'peterchang', avatarUrl: '' },
      { name: 'Rosa Fernandez', githubLogin: 'rosafernandez', avatarUrl: '' },
      { name: 'Steve Kumar', githubLogin: 'stevekumar', avatarUrl: '' },
    ],
    metrics: generateMetrics(2, 12, 'stable'),
    contributionBreakdown: [
      { githubLogin: 'olgaivanova', displayName: 'Olga Ivanova', totalEvents: 26, percentage: 24, isBot: false, isAttributed: true },
      { githubLogin: 'peterchang', displayName: 'Peter Chang', totalEvents: 28, percentage: 26, isBot: false, isAttributed: true },
      { githubLogin: 'rosafernandez', displayName: 'Rosa Fernandez', totalEvents: 25, percentage: 23, isBot: false, isAttributed: true },
      { githubLogin: 'stevekumar', displayName: 'Steve Kumar', totalEvents: 29, percentage: 27, isBot: false, isAttributed: true },
    ],
    checkins: [
      { memberName: 'Olga Ivanova', weekStart: weekStart(0), completedWork: 'Built real-time parking availability map', isBlocked: false, blockerDescription: null, confidenceLevel: 5, submittedAt: daysAgo(0) },
      { memberName: 'Peter Chang', weekStart: weekStart(0), completedWork: 'Implemented parking reservation and payment system', isBlocked: false, blockerDescription: null, confidenceLevel: 4, submittedAt: daysAgo(1) },
      { memberName: 'Rosa Fernandez', weekStart: weekStart(0), completedWork: 'Created navigation and directions integration', isBlocked: false, blockerDescription: null, confidenceLevel: 4, submittedAt: daysAgo(1) },
      { memberName: 'Steve Kumar', weekStart: weekStart(0), completedWork: 'Set up data pipeline and parking lot sensor simulation', isBlocked: false, blockerDescription: null, confidenceLevel: 5, submittedAt: daysAgo(0) },
    ],
    flags: [],
  },
];

// Summary statistics for the demo overview
export const DEMO_STATS = {
  totalTeams: DEMO_TEAMS.length,
  totalStudents: DEMO_TEAMS.reduce((sum, t) => sum + t.members.length, 0),
  teamsNeedingAttention: DEMO_TEAMS.filter(t => t.flags.length > 0).length,
  openFlags: DEMO_TEAMS.reduce((sum, t) => sum + t.flags.filter(f => f.status === 'open').length, 0),
  resolvedFlags: 2,
  checkinCompletionRate: Math.round(
    (DEMO_TEAMS.reduce((sum, t) => sum + t.checkins.length, 0) /
    DEMO_TEAMS.reduce((sum, t) => sum + t.members.length, 0)) * 100
  ),
  courses: [
    { name: 'CS 4400 — Software Engineering', teamCount: 5 },
    { name: 'CS 3200 — Web Development', teamCount: 4 },
    { name: 'Hackathon — HackMIT 2025', teamCount: 4 },
  ],
};
