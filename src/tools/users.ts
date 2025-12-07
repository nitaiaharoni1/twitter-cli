/**
 * User-related MCP tools
 */

import { getTwitterClient } from '../twitter';
import { MCPToolDefinition, MCPResult } from '../types/mcp';
import { formatErrorResult, formatTextResult } from '../utils/result-formatter';

/**
 * Get user information
 */
const getUserInfo = async (args: { username: string }) => {
  try {
    const client = getTwitterClient();
    const username = args.username.replace(/^@/, ''); // Remove @ prefix if present

    console.error(`🔍 Fetching info for user @${username}...`);

    const user = await client.getUserByUsername(username);

    const result = {
      id: user.id,
      username: user.username,
      name: user.name,
      description: user.description,
      created_at: user.created_at,
      public_metrics: user.public_metrics,
      verified: user.verified || false,
      protected: user.protected || false,
      profile_image_url: user.profile_image_url,
      url: user.url,
      profile_url: `https://twitter.com/${user.username}`,
    };

    console.error(`✅ Retrieved info for user @${username}`);

    return formatTextResult(JSON.stringify(result, null, 2));
  } catch (error: any) {
    console.error(`❌ Error fetching user info:`, error.message);
    return formatErrorResult(error.message);
  }
};

/**
 * Get user's tweets
 */
const getUserTweets = async (args: {
  username: string;
  max_results?: number;
  since_id?: string;
  until_id?: string;
  pagination_token?: string;
}) => {
  try {
    const client = getTwitterClient();
    const username = args.username.replace(/^@/, ''); // Remove @ prefix if present
    const maxResults = Math.min(args.max_results || 10, 100);

    console.error(`🔍 Fetching tweets by user @${username}...`);

    // Get user ID from username
    const user = await client.getUserByUsername(username);
    const userId = user.id;

    // Get user timeline
    const timeline = await client.getUserTimeline(userId, {
      maxResults,
      sinceId: args.since_id,
      untilId: args.until_id,
      paginationToken: args.pagination_token,
    });

    const result = {
      username: `@${user.username}`,
      user_id: userId,
      tweets: timeline.data.map((tweet) => ({
        id: tweet.id,
        text: tweet.text,
        created_at: tweet.created_at,
        public_metrics: tweet.public_metrics,
        in_reply_to_user_id: tweet.in_reply_to_user_id,
        referenced_tweets: tweet.referenced_tweets,
        url: `https://twitter.com/i/web/status/${tweet.id}`,
      })),
      pagination: {
        next_token: timeline.meta.next_token,
        result_count: timeline.meta.result_count,
        newest_id: timeline.meta.newest_id,
        oldest_id: timeline.meta.oldest_id,
      },
    };

    console.error(`✅ Retrieved ${timeline.data.length} tweets by @${username}`);

    return formatTextResult(JSON.stringify(result, null, 2));
  } catch (error: any) {
    console.error(`❌ Error fetching user tweets:`, error.message);
    return formatErrorResult(error.message);
  }
};

/**
 * Get user's replies (tweets that are replies to other tweets)
 */
const getUserReplies = async (args: {
  username: string;
  max_results?: number;
  since_id?: string;
  until_id?: string;
  pagination_token?: string;
}) => {
  try {
    const client = getTwitterClient();
    const username = args.username.replace(/^@/, ''); // Remove @ prefix if present
    const maxResults = Math.min(args.max_results || 10, 100);

    console.error(`🔍 Fetching replies by user @${username}...`);

    // Get user ID from username
    const user = await client.getUserByUsername(username);
    const userId = user.id;

    // Get user timeline
    const timeline = await client.getUserTimeline(userId, {
      maxResults,
      sinceId: args.since_id,
      untilId: args.until_id,
      paginationToken: args.pagination_token,
    });

    // Filter to only replies (tweets with in_reply_to_user_id)
    const replies = timeline.data.filter((tweet) => tweet.in_reply_to_user_id);

    const result = {
      username: `@${user.username}`,
      user_id: userId,
      replies: replies.map((tweet) => ({
        id: tweet.id,
        text: tweet.text,
        created_at: tweet.created_at,
        public_metrics: tweet.public_metrics,
        in_reply_to_user_id: tweet.in_reply_to_user_id,
        referenced_tweets: tweet.referenced_tweets,
        url: `https://twitter.com/i/web/status/${tweet.id}`,
      })),
      pagination: {
        next_token: timeline.meta.next_token,
        result_count: replies.length,
        newest_id: timeline.meta.newest_id,
        oldest_id: timeline.meta.oldest_id,
      },
    };

    console.error(`✅ Retrieved ${replies.length} replies by @${username}`);

    return formatTextResult(JSON.stringify(result, null, 2));
  } catch (error: any) {
    console.error(`❌ Error fetching user replies:`, error.message);
    return formatErrorResult(error.message);
  }
};

// Tool definitions
export const userTools: MCPToolDefinition[] = [
  {
    name: 'get_user_info',
    description:
      'Retrieve comprehensive profile information about a Twitter user including their follower count, following count, tweet count, verification status, account creation date, and profile metadata. Useful for understanding a user\'s reputation and activity level on Twitter.',
    inputSchema: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          description: 'Twitter username (can include @ prefix or just the username)',
        },
      },
      required: ['username'],
    },
    handler: getUserInfo,
  },
  {
    name: 'get_user_tweets',
    description:
      'Fetch all tweets posted by a specific Twitter user. Supports pagination for browsing through a user\'s entire tweet history. Perfect for analyzing a user\'s contributions or finding their content.',
    inputSchema: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          description: 'Twitter username (can include @ prefix or just the username)',
        },
        max_results: {
          type: 'number',
          description: 'Number of tweets to retrieve (1-100, default: 10)',
          default: 10,
        },
        since_id: {
          type: 'string',
          description: 'Returns results with a tweet ID greater than (more recent than) the specified ID',
        },
        until_id: {
          type: 'string',
          description: 'Returns results with a tweet ID less than (older than) the specified ID',
        },
        pagination_token: {
          type: 'string',
          description: 'Pagination token from previous response to get next page of results',
        },
      },
      required: ['username'],
    },
    handler: getUserTweets,
  },
  {
    name: 'get_user_replies',
    description:
      'Retrieve all replies made by a specific Twitter user (tweets that are replies to other tweets). Supports pagination for browsing through a user\'s entire reply history. Useful for understanding a user\'s discussion participation and finding their most engaging replies.',
    inputSchema: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          description: 'Twitter username (can include @ prefix or just the username)',
        },
        max_results: {
          type: 'number',
          description: 'Number of replies to retrieve (1-100, default: 10)',
          default: 10,
        },
        since_id: {
          type: 'string',
          description: 'Returns results with a tweet ID greater than (more recent than) the specified ID',
        },
        until_id: {
          type: 'string',
          description: 'Returns results with a tweet ID less than (older than) the specified ID',
        },
        pagination_token: {
          type: 'string',
          description: 'Pagination token from previous response to get next page of results',
        },
      },
      required: ['username'],
    },
    handler: getUserReplies,
  },
];
