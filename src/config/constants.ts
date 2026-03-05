/**
 * Application Constants
 */

// Twitter API limits
export const TWITTER_LIMITS = {
  MAX_TWEETS_PER_REQUEST: 100,
  DEFAULT_TWEETS_LIMIT: 10,
  MAX_TWEET_LENGTH: 280,
  MAX_TWEET_LENGTH_PREMIUM: 4000,
  POSTING_MONTHLY_LIMIT_FREE: 1500,
} as const;

// Twitter API base URLs
export const TWITTER_API_URLS = {
  API_V2: 'https://api.x.com/2',
} as const;

// Tool categories for Twitter operations
export const TOOL_CATEGORIES = {
  TWEETS: 'Tweet Operations',
  USERS: 'User Operations',
  SEARCH: 'Search Operations',
  POSTING: 'Posting Operations',
} as const;
