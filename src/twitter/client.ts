/**
 * Twitter API Client
 * Handles OAuth authentication and API requests to Twitter API v2
 */

import { TwitterApi, TwitterApiReadWrite } from 'twitter-api-v2';

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
  public_metrics?: {
    retweet_count: number;
    like_count: number;
    reply_count: number;
    quote_count: number;
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

export class TwitterClient {
  private config: TwitterConfig;
  private readClient: TwitterApi;
  private writeClient: TwitterApiReadWrite | null = null;

  constructor(config: TwitterConfig) {
    this.config = config;

    // Initialize read client (Bearer token)
    if (config.bearerToken) {
      this.readClient = new TwitterApi(config.bearerToken);
    } else {
      // Fallback to app-only auth if no bearer token
      this.readClient = new TwitterApi({
        appKey: config.apiKey,
        appSecret: config.apiSecret,
      });
    }

    // Initialize write client (OAuth 1.0a) if credentials provided
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
        'tweet.fields': ['created_at', 'public_metrics', 'author_id', 'in_reply_to_user_id', 'referenced_tweets'],
        expansions: ['author_id', 'referenced_tweets.id'],
      });

      if (!tweet.data) {
        throw new Error(`Tweet ${tweetId} not found`);
      }

      return tweet.data as TwitterTweet;
    } catch (error: any) {
      throw new Error(
        `Twitter API error: ${error.message || error.data?.detail || 'Unknown error'}`
      );
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
      const params: any = {
        max_results: maxResults,
        'tweet.fields': ['created_at', 'public_metrics', 'author_id', 'in_reply_to_user_id', 'referenced_tweets'],
        expansions: ['author_id', 'referenced_tweets.id'],
      };

      if (options.sinceId) params.since_id = options.sinceId;
      if (options.untilId) params.until_id = options.untilId;
      if (options.paginationToken) params.pagination_token = options.paginationToken;

      const timeline = await this.readClient.v2.userTimeline(userId, params);

      return {
        data: timeline.data.data || [],
        meta: timeline.data.meta || { result_count: 0 },
        includes: timeline.data.includes,
      } as TwitterTimelineResponse;
    } catch (error: any) {
      throw new Error(
        `Twitter API error: ${error.message || error.data?.detail || 'Unknown error'}`
      );
    }
  }

  /**
   * Get user by username
   */
  async getUserByUsername(username: string): Promise<TwitterUser> {
    try {
      // Remove @ prefix if present
      const cleanUsername = username.replace(/^@/, '');

      const user = await this.readClient.v2.userByUsername(cleanUsername, {
        'user.fields': ['created_at', 'description', 'public_metrics', 'verified', 'protected', 'profile_image_url', 'url'],
      });

      if (!user.data) {
        throw new Error(`User @${cleanUsername} not found`);
      }

      return user.data as TwitterUser;
    } catch (error: any) {
      throw new Error(
        `Twitter API error: ${error.message || error.data?.detail || 'Unknown error'}`
      );
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<TwitterUser> {
    try {
      const user = await this.readClient.v2.user(userId, {
        'user.fields': ['created_at', 'description', 'public_metrics', 'verified', 'protected', 'profile_image_url', 'url'],
      });

      if (!user.data) {
        throw new Error(`User ${userId} not found`);
      }

      return user.data as TwitterUser;
    } catch (error: any) {
      throw new Error(
        `Twitter API error: ${error.message || error.data?.detail || 'Unknown error'}`
      );
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
      const params: any = {
        query,
        max_results: maxResults,
        'tweet.fields': ['created_at', 'public_metrics', 'author_id', 'in_reply_to_user_id', 'referenced_tweets'],
        expansions: ['author_id', 'referenced_tweets.id'],
      };

      if (options.sinceId) params.since_id = options.sinceId;
      if (options.untilId) params.until_id = options.untilId;
      if (options.nextToken) params.next_token = options.nextToken;
      if (options.startTime) params.start_time = options.startTime;
      if (options.endTime) params.end_time = options.endTime;

      const search = await this.readClient.v2.search(params);

      return {
        data: search.data.data || [],
        meta: search.data.meta || { result_count: 0 },
        includes: search.data.includes,
      } as TwitterSearchResponse;
    } catch (error: any) {
      // Check if it's a tier limitation error
      if (error.code === 403 || error.message?.includes('not authorized')) {
        throw new Error(
          'Search API requires Basic tier ($100/mo) or higher. Free tier does not include search functionality.'
        );
      }
      throw new Error(
        `Twitter API error: ${error.message || error.data?.detail || 'Unknown error'}`
      );
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

      // Fetch the full tweet data
      return await this.getTweet(tweet.data.id);
    } catch (error: any) {
      throw new Error(
        `Twitter API error: ${error.message || error.data?.detail || 'Unknown error'}`
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
    } catch (error: any) {
      throw new Error(
        `Twitter API error: ${error.message || error.data?.detail || 'Unknown error'}`
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
    } catch (error: any) {
      throw new Error(
        `Twitter API error: ${error.message || error.data?.detail || 'Unknown error'}`
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
    } catch (error: any) {
      throw new Error(
        `Twitter API error: ${error.message || error.data?.detail || 'Unknown error'}`
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
    } catch (error: any) {
      throw new Error(
        `Twitter API error: ${error.message || error.data?.detail || 'Unknown error'}`
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
    } catch (error: any) {
      throw new Error(
        `Twitter API error: ${error.message || error.data?.detail || 'Unknown error'}`
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
        'user.fields': ['created_at', 'description', 'public_metrics', 'verified', 'protected', 'profile_image_url', 'url'],
      });

      if (!me.data) {
        throw new Error('Failed to get current user');
      }

      return me.data as TwitterUser;
    } catch (error: any) {
      throw new Error(
        `Twitter API error: ${error.message || error.data?.detail || 'Unknown error'}`
      );
    }
  }
}
