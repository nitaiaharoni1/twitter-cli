/**
 * Twitter API Client
 * Handles OAuth authentication and API requests to Twitter API v2
 */

import { TwitterApi, TwitterApiReadWrite, ApiResponseError, ApiRequestError } from 'twitter-api-v2';

export interface TwitterConfig {
  apiKey: string;
  apiSecret: string;
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

export class TwitterClient {
  private config: TwitterConfig;
  private readClient: TwitterApi;
  private writeClient: TwitterApiReadWrite | null = null;

  constructor(config: TwitterConfig) {
    this.config = config;

    if (config.bearerToken) {
      this.readClient = new TwitterApi(config.bearerToken);
    } else {
      // Fallback to app-only auth if no bearer token
      this.readClient = new TwitterApi({
        appKey: config.apiKey,
        appSecret: config.apiSecret,
      });
    }

    if (config.accessToken && config.accessSecret) {
      this.writeClient = new TwitterApi({
        appKey: config.apiKey,
        appSecret: config.apiSecret,
        accessToken: config.accessToken,
        accessSecret: config.accessSecret,
      }).readWrite;
    }
  }

  /**
   * Get a single tweet by ID
   */
  async getTweet(tweetId: string): Promise<TwitterTweet> {
    try {
      const tweet = await this.readClient.v2.singleTweet(tweetId, {
        'tweet.fields': TWEET_FIELDS,
        expansions: ['author_id', 'referenced_tweets.id'],
      });

      if (!tweet.data) {
        throw new Error(`Tweet ${tweetId} not found`);
      }

      return tweet.data as TwitterTweet;
    } catch (error) {
      if (error instanceof Error && !error.message.startsWith('Twitter')) {
        throw error;
      }
      handleApiError(error, 'For read operations, ensure TWITTER_BEARER_TOKEN is set.');
    }
  }

  /**
   * Get user timeline (tweets by a user)
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
      };

      if (options.sinceId) params.since_id = options.sinceId;
      if (options.untilId) params.until_id = options.untilId;
      if (options.paginationToken) params.pagination_token = options.paginationToken;

      const timeline = await this.readClient.v2.userTimeline(userId, params as any);

      return {
        data: timeline.data.data || [],
        meta: timeline.data.meta || { result_count: 0 },
        includes: timeline.data.includes,
      } as TwitterTimelineResponse;
    } catch (error) {
      handleApiError(error, 'For read operations, ensure TWITTER_BEARER_TOKEN is set.');
    }
  }

  /**
   * Get user by username
   */
  async getUserByUsername(username: string): Promise<TwitterUser> {
    try {
      const cleanUsername = username.replace(/^@/, '');

      const user = await this.readClient.v2.userByUsername(cleanUsername, {
        'user.fields': USER_FIELDS,
      });

      if (!user.data) {
        throw new Error(`User @${cleanUsername} not found`);
      }

      return user.data as TwitterUser;
    } catch (error) {
      if (error instanceof Error && !error.message.startsWith('Twitter')) {
        throw error;
      }
      handleApiError(error, 'For read operations, ensure TWITTER_BEARER_TOKEN is set.');
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<TwitterUser> {
    try {
      const user = await this.readClient.v2.user(userId, {
        'user.fields': USER_FIELDS,
      });

      if (!user.data) {
        throw new Error(`User ${userId} not found`);
      }

      return user.data as TwitterUser;
    } catch (error) {
      if (error instanceof Error && !error.message.startsWith('Twitter')) {
        throw error;
      }
      handleApiError(error, 'For read operations, ensure TWITTER_BEARER_TOKEN is set.');
    }
  }

  /**
   * Search tweets (requires Basic tier or higher)
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
      };

      if (options.sinceId) params.since_id = options.sinceId;
      if (options.untilId) params.until_id = options.untilId;
      if (options.nextToken) params.next_token = options.nextToken;
      if (options.startTime) params.start_time = options.startTime;
      if (options.endTime) params.end_time = options.endTime;

      const search = await this.readClient.v2.search(query, params as any);

      return {
        data: search.data.data || [],
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
              'Twitter API error: Search API requires Basic tier ($100/mo) or higher. Free tier does not include search functionality.'
            );
          }
          throw new Error(
            'Twitter API error: Authentication failed (403). For search, provide TWITTER_BEARER_TOKEN and ensure your account has Basic tier access.'
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
   * Post a tweet
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
        tweetData.reply = {
          in_reply_to_tweet_id: options.replyToTweetId,
        };
        if (options.excludeReplyUserIds) {
          tweetData.reply.exclude_reply_user_ids = options.excludeReplyUserIds;
        }
      }

      const tweet = await this.writeClient.v2.tweet(tweetData);

      if (!tweet.data) {
        throw new Error('Failed to create tweet');
      }

      return await this.getTweet(tweet.data.id);
    } catch (error) {
      if (error instanceof Error && !error.message.startsWith('Twitter')) {
        throw error;
      }
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
    return this.postTweet(text, {
      replyToTweetId: tweetId,
      excludeReplyUserIds,
    });
  }

  /**
   * Like a tweet
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
   * Unlike a tweet
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
   * Retweet a tweet
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
   * Unretweet a tweet
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
   * Delete a tweet
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
   * Get current authenticated user
   */
  async getMe(): Promise<TwitterUser> {
    if (!this.writeClient) {
      throw new Error(
        'Getting current user requires OAuth 1.0a authentication. Please provide TWITTER_ACCESS_TOKEN and TWITTER_ACCESS_SECRET.'
      );
    }

    try {
      const me = await this.writeClient.v2.me({
        'user.fields': USER_FIELDS,
      });

      if (!me.data) {
        throw new Error('Failed to get current user');
      }

      return me.data as TwitterUser;
    } catch (error) {
      if (error instanceof Error && !error.message.startsWith('Twitter')) {
        throw error;
      }
      handleApiError(
        error,
        'Getting current user requires OAuth 1.0a authentication. Please provide TWITTER_ACCESS_TOKEN and TWITTER_ACCESS_SECRET.'
      );
    }
  }
}
