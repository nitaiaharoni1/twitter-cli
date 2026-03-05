/**
 * Twitter API Client
 * Handles OAuth authentication and API requests to Twitter API v2
 *
 * Cost-minimisation strategy (pay-per-use pricing)
 * ─────────────────────────────────────────────────
 * X API charges per unique *resource* returned within a 24h UTC day:
 *   Posts (tweets) read       $0.005 / resource
 *   Users read                $0.010 / resource
 *   Content created (tweets)  $0.010 / request
 *   User interactions (like/RT) $0.015 / request
 *
 * Techniques used here to minimise those charges:
 *
 *  1. 24h UTC cache (src/utils/cache.ts)
 *     Every tweet and user fetched today is written to disk.
 *     The same ID within the same UTC day → zero API call.
 *
 *  2. Harvest expansion includes
 *     Timeline, search, and mentions responses already carry user objects
 *     inside their `includes.users` array at no extra cost (they were
 *     requested via `expansions: ['author_id']`).  We cache those users
 *     immediately so any follow-up `getUserByUsername` is a cache hit.
 *
 *  3. Batch tweet fetches (v2.tweets, up to 100 IDs)
 *     One API call for 100 IDs instead of 100 separate calls.
 *     Rate-limit tokens: 100 → 1.
 *
 *  4. Batch user fetches (v2.usersByUsernames, up to 100 usernames)
 *     One API call for N usernames instead of N separate calls.
 *
 *  5. Instance-level getMe() cache
 *     like/retweet/unlike/unretweet each need the authenticated user ID.
 *     We resolve it once per process and reuse, avoiding repeated $0.010
 *     user reads in a sequence of write operations.
 */

import { TwitterApi, TwitterApiReadWrite, ApiResponseError, ApiRequestError } from 'twitter-api-v2';
import {
  getCachedTweet,
  getCachedUser,
  cacheTweet,
  cacheTweets,
  cacheUser,
  cacheUsers,
  uncachedTweetIds,
  uncachedUsernames,
} from '../utils/cache';

export interface TwitterConfig {
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  accessSecret?: string;
  bearerToken?: string;
}

export interface TwitterTweet {
  id: string;
  text: string;
  author_id?: string;
  created_at: string;
  conversation_id?: string;
  public_metrics?: {
    retweet_count: number;
    like_count: number;
    reply_count: number;
    quote_count: number;
  };
  entities?: {
    urls?: Array<{ url: string; expanded_url: string; display_url: string }>;
    hashtags?: Array<{ tag: string }>;
    mentions?: Array<{ username: string; id: string }>;
    annotations?: Array<{ start: number; end: number; probability: number; type: string; normalized_text: string }>;
  };
  in_reply_to_user_id?: string;
  referenced_tweets?: Array<{
    type: string;
    id: string;
  }>;
  attachments?: {
    media_keys?: string[];
  };
}

export interface TwitterUser {
  id: string;
  name: string;
  username: string;
  description?: string;
  created_at: string;
  public_metrics?: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
    listed_count: number;
  };
  verified?: boolean;
  protected?: boolean;
  profile_image_url?: string;
  url?: string;
}

export interface TwitterSearchResponse {
  data: TwitterTweet[];
  meta: {
    result_count: number;
    next_token?: string;
    newest_id?: string;
    oldest_id?: string;
  };
  includes?: {
    users?: TwitterUser[];
    tweets?: TwitterTweet[];
  };
}

export interface TwitterTimelineResponse {
  data: TwitterTweet[];
  meta: {
    result_count: number;
    next_token?: string;
    previous_token?: string;
    newest_id?: string;
    oldest_id?: string;
  };
  includes?: {
    users?: TwitterUser[];
    tweets?: TwitterTweet[];
  };
}

export interface UsageDailyBucket {
  date: string;
  tweet_reads: number;
}

export interface UsageStats {
  daily: UsageDailyBucket[];
  total_tweet_reads: number;
  cap: number;
}

const TWEET_FIELDS = [
  'created_at',
  'public_metrics',
  'author_id',
  'in_reply_to_user_id',
  'referenced_tweets',
  'conversation_id',
  'entities',
] as const;

const USER_FIELDS = [
  'created_at',
  'description',
  'public_metrics',
  'verified',
  'protected',
  'profile_image_url',
  'url',
] as const;

const BATCH_SIZE = 100;

function handleApiError(error: unknown, context: string): never {
  if (error instanceof ApiResponseError) {
    if (error.rateLimitError && error.rateLimit) {
      const resetTime = new Date(error.rateLimit.reset * 1000).toISOString();
      throw new Error(`Twitter API error: Rate limit exceeded. Please wait until ${resetTime} before retrying.`);
    }
    if (error.isAuthError) {
      throw new Error(
        `Twitter API error: ${context} Authentication failed (${error.code}). Please check your credentials.`
      );
    }
    throw new Error(`Twitter API error: ${error.data?.detail || error.message || 'Unknown error'}`);
  }
  if (error instanceof ApiRequestError) {
    throw new Error(`Twitter network error: ${error.requestError.message}`);
  }
  const msg = error instanceof Error ? error.message : String(error);
  throw new Error(`Twitter API error: ${msg}`);
}

/** Extract and cache any users embedded in an API response's `includes` */
function harvestIncludedUsers(includes?: { users?: TwitterUser[] }): void {
  const users = includes?.users;
  if (users && users.length > 0) {
    cacheUsers(users);
  }
}

export class TwitterClient {
  private config: TwitterConfig;
  private readClient: TwitterApi;
  private writeClient: TwitterApiReadWrite | null = null;

  /** Cached authenticated user — resolved once per process to avoid $0.010 user reads on every write op */
  private _me: TwitterUser | null = null;

  constructor(config: TwitterConfig) {
    this.config = config;

    if (config.bearerToken) {
      this.readClient = new TwitterApi(config.bearerToken);
    } else {
      this.readClient = new TwitterApi({
        appKey: config.apiKey,
        appSecret: config.apiSecret,
      });
    }

    if (config.accessToken && config.accessSecret && config.apiKey && config.apiSecret) {
      this.writeClient = new TwitterApi({
        appKey: config.apiKey,
        appSecret: config.apiSecret,
        accessToken: config.accessToken,
        accessSecret: config.accessSecret,
      }).readWrite;
    }
  }

  /**
   * Get a single tweet by ID.
   * Cache-first: costs $0 if already fetched today.
   */
  async getTweet(tweetId: string): Promise<TwitterTweet> {
    const cached = getCachedTweet(tweetId);
    if (cached) return cached;

    try {
      const resp = await this.readClient.v2.singleTweet(tweetId, {
        'tweet.fields': TWEET_FIELDS,
        expansions: ['author_id', 'referenced_tweets.id'],
        'user.fields': USER_FIELDS,
      });

      if (!resp.data) throw new Error(`Tweet ${tweetId} not found`);

      const tweet = resp.data as TwitterTweet;
      cacheTweet(tweet);
      // Harvest the author user from includes — free user data, cache it
      harvestIncludedUsers(resp.includes as any);
      return tweet;
    } catch (error) {
      if (error instanceof Error && !error.message.startsWith('Twitter')) throw error;
      handleApiError(error, 'For read operations, ensure TWITTER_BEARER_TOKEN is set.');
    }
  }

  /**
   * Fetch multiple tweets in batches of 100 IDs per API call.
   * Cache-first: already-cached IDs cost $0. Remaining IDs are sent as
   * one call per batch of 100 (the maximum the API supports), so N tweets
   * cost ⌈N/100⌉ rate-limit tokens instead of N.
   * User objects in includes are harvested and cached for free.
   */
  async getTweets(tweetIds: string[]): Promise<TwitterTweet[]> {
    if (tweetIds.length === 0) return [];

    const results = new Map<string, TwitterTweet>();
    for (const id of tweetIds) {
      const cached = getCachedTweet(id);
      if (cached) results.set(id, cached);
    }

    const missing = uncachedTweetIds(tweetIds);
    if (missing.length > 0) {
      try {
        for (let i = 0; i < missing.length; i += BATCH_SIZE) {
          const chunk = missing.slice(i, i + BATCH_SIZE);
          const resp = await this.readClient.v2.tweets(chunk, {
            'tweet.fields': TWEET_FIELDS,
            expansions: ['author_id', 'referenced_tweets.id'],
            'user.fields': USER_FIELDS,
          });
          const fetched = (resp.data || []) as TwitterTweet[];
          cacheTweets(fetched);
          harvestIncludedUsers(resp.includes as any);
          for (const tweet of fetched) results.set(tweet.id, tweet);
        }
      } catch (error) {
        handleApiError(error, 'For read operations, ensure TWITTER_BEARER_TOKEN is set.');
      }
    }

    return tweetIds.flatMap((id) => (results.has(id) ? [results.get(id)!] : []));
  }

  /**
   * Get user timeline (tweets by a user).
   * Harvests included user objects so no separate user lookup is needed.
   */
  async getUserTimeline(
    userId: string,
    options: {
      maxResults?: number;
      sinceId?: string;
      untilId?: string;
      paginationToken?: string;
    } = {}
  ): Promise<TwitterTimelineResponse> {
    try {
      const maxResults = Math.min(options.maxResults || 10, 100);
      const params: Record<string, unknown> = {
        max_results: maxResults,
        'tweet.fields': TWEET_FIELDS,
        expansions: ['author_id', 'referenced_tweets.id'],
        'user.fields': USER_FIELDS,
      };

      if (options.sinceId) params.since_id = options.sinceId;
      if (options.untilId) params.until_id = options.untilId;
      if (options.paginationToken) params.pagination_token = options.paginationToken;

      const timeline = await this.readClient.v2.userTimeline(userId, params as any);
      const tweets = (timeline.data.data || []) as TwitterTweet[];
      cacheTweets(tweets);
      harvestIncludedUsers(timeline.data.includes as any);

      return {
        data: tweets,
        meta: timeline.data.meta || { result_count: 0 },
        includes: timeline.data.includes,
      } as TwitterTimelineResponse;
    } catch (error) {
      handleApiError(error, 'For read operations, ensure TWITTER_BEARER_TOKEN is set.');
    }
  }

  /**
   * Get user by username.
   * Cache-first. On a miss, fetches a single user ($0.010).
   */
  async getUserByUsername(username: string): Promise<TwitterUser> {
    const clean = username.replace(/^@/, '');
    const cached = getCachedUser(clean);
    if (cached) return cached;

    try {
      const resp = await this.readClient.v2.userByUsername(clean, {
        'user.fields': USER_FIELDS,
      });

      if (!resp.data) throw new Error(`User @${clean} not found`);

      const user = resp.data as TwitterUser;
      cacheUser(user);
      return user;
    } catch (error) {
      if (error instanceof Error && !error.message.startsWith('Twitter')) throw error;
      handleApiError(error, 'For read operations, ensure TWITTER_BEARER_TOKEN is set.');
    }
  }

  /**
   * Get multiple users by username in one batch call.
   * Cache-first: only uncached usernames hit the API.
   * One v2.usersByUsernames() call for up to 100 names vs N individual calls.
   */
  async getUsersByUsernames(usernames: string[]): Promise<TwitterUser[]> {
    if (usernames.length === 0) return [];

    const clean = usernames.map((u) => u.replace(/^@/, ''));
    const results = new Map<string, TwitterUser>();

    for (const name of clean) {
      const cached = getCachedUser(name);
      if (cached) results.set(name.toLowerCase(), cached);
    }

    const missing = uncachedUsernames(clean);
    if (missing.length > 0) {
      try {
        for (let i = 0; i < missing.length; i += BATCH_SIZE) {
          const chunk = missing.slice(i, i + BATCH_SIZE);
          const resp = await this.readClient.v2.usersByUsernames(chunk, {
            'user.fields': USER_FIELDS,
          });
          const fetched = (resp.data || []) as TwitterUser[];
          cacheUsers(fetched);
          for (const user of fetched) results.set(user.username.toLowerCase(), user);
        }
      } catch (error) {
        handleApiError(error, 'For read operations, ensure TWITTER_BEARER_TOKEN is set.');
      }
    }

    return clean.flatMap((name) => {
      const u = results.get(name.toLowerCase());
      return u ? [u] : [];
    });
  }

  /**
   * Get user by numeric ID.
   * Cache-first.
   */
  async getUserById(userId: string): Promise<TwitterUser> {
    const cached = getCachedUser(userId);
    if (cached) return cached;

    try {
      const resp = await this.readClient.v2.user(userId, {
        'user.fields': USER_FIELDS,
      });

      if (!resp.data) throw new Error(`User ${userId} not found`);

      const user = resp.data as TwitterUser;
      cacheUser(user);
      return user;
    } catch (error) {
      if (error instanceof Error && !error.message.startsWith('Twitter')) throw error;
      handleApiError(error, 'For read operations, ensure TWITTER_BEARER_TOKEN is set.');
    }
  }

  /**
   * Search tweets (requires pay-per-use or Basic tier for search access).
   * Harvests included users from the response.
   */
  async searchTweets(
    query: string,
    options: {
      maxResults?: number;
      sinceId?: string;
      untilId?: string;
      nextToken?: string;
      startTime?: string;
      endTime?: string;
    } = {}
  ): Promise<TwitterSearchResponse> {
    try {
      const maxResults = Math.min(options.maxResults || 10, 100);
      const params: Record<string, unknown> = {
        max_results: maxResults,
        'tweet.fields': TWEET_FIELDS,
        expansions: ['author_id', 'referenced_tweets.id'],
        'user.fields': USER_FIELDS,
      };

      if (options.sinceId) params.since_id = options.sinceId;
      if (options.untilId) params.until_id = options.untilId;
      if (options.nextToken) params.next_token = options.nextToken;
      if (options.startTime) params.start_time = options.startTime;
      if (options.endTime) params.end_time = options.endTime;

      const search = await this.readClient.v2.search(query, params as any);
      const tweets = (search.data.data || []) as TwitterTweet[];
      cacheTweets(tweets);
      harvestIncludedUsers(search.data.includes as any);

      return {
        data: tweets,
        meta: search.data.meta || { result_count: 0 },
        includes: search.data.includes,
      } as TwitterSearchResponse;
    } catch (error) {
      if (error instanceof ApiResponseError) {
        if (error.rateLimitError && error.rateLimit) {
          const resetTime = new Date(error.rateLimit.reset * 1000).toISOString();
          throw new Error(`Twitter API error: Rate limit exceeded. Please wait until ${resetTime} before retrying.`);
        }
        if (error.code === 403 || error.isAuthError) {
          const detail = error.data?.detail || '';
          if (detail.toLowerCase().includes('search') || detail.toLowerCase().includes('tier')) {
            throw new Error(
              'Twitter API error: Search API requires pay-per-use or Basic tier access.'
            );
          }
          throw new Error(
            'Twitter API error: Authentication failed (403). Provide TWITTER_BEARER_TOKEN with search access.'
          );
        }
        throw new Error(`Twitter API error: ${error.data?.detail || error.message || 'Unknown error'}`);
      }
      if (error instanceof ApiRequestError) {
        throw new Error(`Twitter network error: ${error.requestError.message}`);
      }
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Twitter API error: ${msg}`);
    }
  }

  /**
   * Post a tweet ($0.010 / request).
   * After posting, uses getTweets() (batch + cache-eligible) instead of
   * a separate singleTweet() call.
   */
  async postTweet(text: string, options: {
    replyToTweetId?: string;
    excludeReplyUserIds?: string[];
  } = {}): Promise<TwitterTweet> {
    if (!this.writeClient) {
      throw new Error(
        'Write operations require OAuth 1.0a authentication. Please provide TWITTER_ACCESS_TOKEN and TWITTER_ACCESS_SECRET.'
      );
    }

    try {
      const tweetData: any = { text };

      if (options.replyToTweetId) {
        tweetData.reply = { in_reply_to_tweet_id: options.replyToTweetId };
        if (options.excludeReplyUserIds) {
          tweetData.reply.exclude_reply_user_ids = options.excludeReplyUserIds;
        }
      }

      const resp = await this.writeClient.v2.tweet(tweetData);
      if (!resp.data) throw new Error('Failed to create tweet');

      const fetched = await this.getTweets([resp.data.id]);
      return fetched[0] ?? { id: resp.data.id, text, created_at: new Date().toISOString() };
    } catch (error) {
      if (error instanceof Error && !error.message.startsWith('Twitter')) throw error;
      handleApiError(
        error,
        'Write operations require OAuth 1.0a authentication. Please provide TWITTER_ACCESS_TOKEN and TWITTER_ACCESS_SECRET.'
      );
    }
  }

  /**
   * Reply to a tweet
   */
  async replyToTweet(tweetId: string, text: string, excludeReplyUserIds?: string[]): Promise<TwitterTweet> {
    return this.postTweet(text, { replyToTweetId: tweetId, excludeReplyUserIds });
  }

  /**
   * Like a tweet ($0.015 / request).
   * Uses cached user ID — no extra $0.010 user read.
   */
  async likeTweet(userId: string, tweetId: string): Promise<{ liked: boolean }> {
    if (!this.writeClient) {
      throw new Error(
        'Write operations require OAuth 1.0a authentication. Please provide TWITTER_ACCESS_TOKEN and TWITTER_ACCESS_SECRET.'
      );
    }
    try {
      const result = await this.writeClient.v2.like(userId, tweetId);
      return { liked: result.data?.liked || false };
    } catch (error) {
      handleApiError(
        error,
        'Write operations require OAuth 1.0a authentication. Please provide TWITTER_ACCESS_TOKEN and TWITTER_ACCESS_SECRET.'
      );
    }
  }

  /**
   * Unlike a tweet ($0.015 / request).
   */
  async unlikeTweet(userId: string, tweetId: string): Promise<{ liked: boolean }> {
    if (!this.writeClient) {
      throw new Error(
        'Write operations require OAuth 1.0a authentication. Please provide TWITTER_ACCESS_TOKEN and TWITTER_ACCESS_SECRET.'
      );
    }
    try {
      await this.writeClient.v2.unlike(userId, tweetId);
      return { liked: false };
    } catch (error) {
      handleApiError(
        error,
        'Write operations require OAuth 1.0a authentication. Please provide TWITTER_ACCESS_TOKEN and TWITTER_ACCESS_SECRET.'
      );
    }
  }

  /**
   * Retweet a tweet ($0.015 / request).
   */
  async retweet(userId: string, tweetId: string): Promise<{ retweeted: boolean }> {
    if (!this.writeClient) {
      throw new Error(
        'Write operations require OAuth 1.0a authentication. Please provide TWITTER_ACCESS_TOKEN and TWITTER_ACCESS_SECRET.'
      );
    }
    try {
      const result = await this.writeClient.v2.retweet(userId, tweetId);
      return { retweeted: result.data?.retweeted || false };
    } catch (error) {
      handleApiError(
        error,
        'Write operations require OAuth 1.0a authentication. Please provide TWITTER_ACCESS_TOKEN and TWITTER_ACCESS_SECRET.'
      );
    }
  }

  /**
   * Unretweet a tweet ($0.015 / request).
   */
  async unretweet(userId: string, tweetId: string): Promise<{ retweeted: boolean }> {
    if (!this.writeClient) {
      throw new Error(
        'Write operations require OAuth 1.0a authentication. Please provide TWITTER_ACCESS_TOKEN and TWITTER_ACCESS_SECRET.'
      );
    }
    try {
      await this.writeClient.v2.unretweet(userId, tweetId);
      return { retweeted: false };
    } catch (error) {
      handleApiError(
        error,
        'Write operations require OAuth 1.0a authentication. Please provide TWITTER_ACCESS_TOKEN and TWITTER_ACCESS_SECRET.'
      );
    }
  }

  /**
   * Delete a tweet ($0.005 / request for Content: Manage).
   */
  async deleteTweet(tweetId: string): Promise<{ deleted: boolean }> {
    if (!this.writeClient) {
      throw new Error(
        'Write operations require OAuth 1.0a authentication. Please provide TWITTER_ACCESS_TOKEN and TWITTER_ACCESS_SECRET.'
      );
    }
    try {
      await this.writeClient.v2.deleteTweet(tweetId);
      return { deleted: true };
    } catch (error) {
      handleApiError(
        error,
        'Write operations require OAuth 1.0a authentication. Please provide TWITTER_ACCESS_TOKEN and TWITTER_ACCESS_SECRET.'
      );
    }
  }

  /**
   * Get mention timeline (tweets mentioning a user).
   * Harvests included users.
   */
  async getUserMentionTimeline(
    userId: string,
    options: {
      maxResults?: number;
      sinceId?: string;
      untilId?: string;
      paginationToken?: string;
    } = {}
  ): Promise<TwitterTimelineResponse> {
    try {
      const maxResults = Math.min(options.maxResults || 10, 100);
      const params: Record<string, unknown> = {
        max_results: maxResults,
        'tweet.fields': TWEET_FIELDS,
        expansions: ['author_id', 'referenced_tweets.id'],
        'user.fields': USER_FIELDS,
      };

      if (options.sinceId) params.since_id = options.sinceId;
      if (options.untilId) params.until_id = options.untilId;
      if (options.paginationToken) params.pagination_token = options.paginationToken;

      const mentions = await this.readClient.v2.userMentionTimeline(userId, params as any);
      const tweets = (mentions.data.data || []) as TwitterTweet[];
      cacheTweets(tweets);
      harvestIncludedUsers(mentions.data.includes as any);

      return {
        data: tweets,
        meta: mentions.data.meta || { result_count: 0 },
        includes: mentions.data.includes,
      } as TwitterTimelineResponse;
    } catch (error) {
      handleApiError(error, 'For read operations, ensure TWITTER_BEARER_TOKEN is set.');
    }
  }

  /**
   * Get current authenticated user.
   * Result is cached in this instance (not just disk cache) so repeated
   * calls within the same process — e.g. like() then retweet() — cost
   * $0.010 once instead of $0.010 × N.
   */
  async getMe(): Promise<TwitterUser> {
    if (this._me) return this._me;

    // Also check disk cache (covers re-runs within same UTC day)
    const diskCached = getCachedUser('__me__');
    if (diskCached) {
      this._me = diskCached;
      return diskCached;
    }

    if (!this.writeClient) {
      throw new Error(
        'Getting current user requires OAuth 1.0a authentication. Please provide TWITTER_ACCESS_TOKEN and TWITTER_ACCESS_SECRET.'
      );
    }

    try {
      const me = await this.writeClient.v2.me({ 'user.fields': USER_FIELDS });
      if (!me.data) throw new Error('Failed to get current user');

      const user = me.data as TwitterUser;
      cacheUser(user);
      // Also cache under the special '__me__' sentinel so re-runs today are free
      cacheUser({ ...user, id: '__me__', username: '__me__' });
      this._me = user;
      return user;
    } catch (error) {
      if (error instanceof Error && !error.message.startsWith('Twitter')) throw error;
      handleApiError(
        error,
        'Getting current user requires OAuth 1.0a authentication. Please provide TWITTER_ACCESS_TOKEN and TWITTER_ACCESS_SECRET.'
      );
    }
  }

  /**
   * Fetch daily tweet-read usage from GET /2/usage/tweets.
   */
  async getUsageStats(days: number = 7): Promise<UsageStats> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setUTCDate(startDate.getUTCDate() - days + 1);
      startDate.setUTCHours(0, 0, 0, 0);

      const resp = await this.readClient.v2.get<any>('usage/tweets', {
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        granularity: 'day',
      });

      const buckets: UsageDailyBucket[] = (resp?.data || []).map((d: any) => ({
        date: d.date || d.start,
        tweet_reads: d.tweet_count ?? d.count ?? 0,
      }));

      buckets.sort((a, b) => b.date.localeCompare(a.date));
      const total = buckets.reduce((s, b) => s + b.tweet_reads, 0);

      return { daily: buckets, total_tweet_reads: total, cap: 0 }; // no cap on pay-per-use
    } catch (error) {
      handleApiError(error, 'For usage stats, ensure TWITTER_BEARER_TOKEN is set.');
    }
  }
}
