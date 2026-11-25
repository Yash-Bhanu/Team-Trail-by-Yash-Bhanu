// GitHub App & Octokit integration — server-only
// Least-privilege: Metadata: read, Pull requests: read, Issues: read.
// Never requests Contents or write permissions.
import 'server-only';

import { App } from '@octokit/app';
import { env, isGitHubAppConfigured } from '@/lib/env';
import { createChildLogger } from '@/server/security/logger';

const log = createChildLogger('github-app');

let cachedApp: App | null = null;

export function getGitHubApp(): App | null {
  if (!isGitHubAppConfigured()) {
    return null;
  }

  if (cachedApp) return cachedApp;

  try {
    const privateKeyRaw = env.GITHUB_APP_PRIVATE_KEY!;
    const privateKey = privateKeyRaw.includes('BEGIN')
      ? privateKeyRaw.replace(/\\n/g, '\n')
      : Buffer.from(privateKeyRaw, 'base64').toString('utf-8');

    cachedApp = new App({
      appId: env.GITHUB_APP_ID!,
      privateKey,
      webhooks: {
        secret: env.GITHUB_WEBHOOK_SECRET!,
      },
    });

    return cachedApp;
  } catch (error) {
    log.error({ error }, 'Failed to initialize GitHub App client');
    return null;
  }
}

export interface ApprovedActivityMetadata {
  activityType:
    | 'pr_opened'
    | 'pr_merged'
    | 'pr_closed'
    | 'pr_review_submitted'
    | 'pr_review_comment'
    | 'issue_opened'
    | 'issue_closed'
    | 'issue_comment';
  githubEventId: string;
  actorGithubUserId: number | null;
  actorGithubLogin: string | null;
  isBot: boolean;
  externalUrl: string | null;
  prNumber: number | null;
  issueNumber: number | null;
  eventTimestamp: Date;
  metadata: Record<string, unknown>;
}

/**
 * Fetch 30-day historical PR and issue metadata using GraphQL field selection.
 * Explicitly avoids requesting PR/issue bodies, comments, patches, or file contents.
 */
export async function fetchHistoricalRepoMetadata(
  installationId: number,
  owner: string,
  repo: string,
  sinceDate: Date
): Promise<ApprovedActivityMetadata[]> {
  const app = getGitHubApp();
  if (!app) {
    throw new Error('GitHub App is not configured');
  }

  const octokit = await app.getInstallationOctokit(installationId);
  const events: ApprovedActivityMetadata[] = [];

  // GraphQL query selecting ONLY approved metadata fields (no body, no diff, no files)
  const query = `
    query RepoActivity($owner: String!, $repo: String!, $cursor: String) {
      repository(owner: $owner, name: $repo) {
        pullRequests(first: 50, after: $cursor, orderBy: {field: UPDATED_AT, direction: DESC}) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            number
            url
            createdAt
            closedAt
            mergedAt
            merged
            author {
              login
              __typename
              ... on User { databaseId }
              ... on Bot { databaseId }
            }
            reviews(first: 20) {
              nodes {
                id
                createdAt
                state
                url
                author {
                  login
                  __typename
                  ... on User { databaseId }
                  ... on Bot { databaseId }
                }
              }
            }
          }
        }
      }
    }
  `;

  let cursor: string | null = null;
  let pages = 0;
  const maxPages = 5; // Bounded pagination to respect rate limits

  interface GraphQLRepoActivity {
    repository: {
      pullRequests: {
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
        nodes: Array<{
          id: string;
          number: number;
          url: string;
          createdAt: string;
          closedAt: string | null;
          mergedAt: string | null;
          merged: boolean;
          author: { login: string; __typename: string; databaseId?: number } | null;
          reviews: {
            nodes: Array<{
              id: string;
              createdAt: string;
              state: string;
              url: string;
              author: { login: string; __typename: string; databaseId?: number } | null;
            }>;
          };
        }>;
      };
    };
  }

  while (pages < maxPages) {
    const result: GraphQLRepoActivity = await octokit.graphql<GraphQLRepoActivity>(
      query,
      { owner, repo, cursor }
    );

    const prs = result.repository.pullRequests.nodes;
    let reachedCutoff = false;

    for (const pr of prs) {
      const createdAt = new Date(pr.createdAt);
      if (createdAt < sinceDate) {
        reachedCutoff = true;
      }

      const isBot = pr.author?.__typename === 'Bot' || (pr.author?.login?.endsWith('[bot]') ?? false);

      if (createdAt >= sinceDate) {
        events.push({
          activityType: 'pr_opened',
          githubEventId: `pr-open-${pr.id}`,
          actorGithubUserId: pr.author?.databaseId ?? null,
          actorGithubLogin: pr.author?.login ?? null,
          isBot,
          externalUrl: pr.url,
          prNumber: pr.number,
          issueNumber: null,
          eventTimestamp: createdAt,
          metadata: { state: 'opened' },
        });
      }

      if (pr.merged && pr.mergedAt && new Date(pr.mergedAt) >= sinceDate) {
        events.push({
          activityType: 'pr_merged',
          githubEventId: `pr-merge-${pr.id}`,
          actorGithubUserId: pr.author?.databaseId ?? null,
          actorGithubLogin: pr.author?.login ?? null,
          isBot,
          externalUrl: pr.url,
          prNumber: pr.number,
          issueNumber: null,
          eventTimestamp: new Date(pr.mergedAt),
          metadata: { merged: true },
        });
      } else if (pr.closedAt && !pr.merged && new Date(pr.closedAt) >= sinceDate) {
        events.push({
          activityType: 'pr_closed',
          githubEventId: `pr-close-${pr.id}`,
          actorGithubUserId: pr.author?.databaseId ?? null,
          actorGithubLogin: pr.author?.login ?? null,
          isBot,
          externalUrl: pr.url,
          prNumber: pr.number,
          issueNumber: null,
          eventTimestamp: new Date(pr.closedAt),
          metadata: { merged: false },
        });
      }

      for (const review of pr.reviews.nodes) {
        const revDate = new Date(review.createdAt);
        if (revDate >= sinceDate) {
          const revBot = review.author?.__typename === 'Bot' || (review.author?.login?.endsWith('[bot]') ?? false);
          events.push({
            activityType: 'pr_review_submitted',
            githubEventId: `pr-rev-${review.id}`,
            actorGithubUserId: review.author?.databaseId ?? null,
            actorGithubLogin: review.author?.login ?? null,
            isBot: revBot,
            externalUrl: review.url,
            prNumber: pr.number,
            issueNumber: null,
            eventTimestamp: revDate,
            metadata: { reviewState: review.state },
          });
        }
      }
    }

    if (reachedCutoff || !result.repository.pullRequests.pageInfo.hasNextPage) {
      break;
    }

    cursor = result.repository.pullRequests.pageInfo.endCursor;
    pages++;
  }

  return events;
}
