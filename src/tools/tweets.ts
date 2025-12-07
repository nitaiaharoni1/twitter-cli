/**
 * Tweet-related MCP tools
 */

import { getTwitterClient } from '../twitter';
import { MCPToolDefinition, MCPResult } from '../types/mcp';
import { formatErrorResult, formatTextResult } from '../utils/result-formatter';

/**
 * Get a single tweet by ID
 */
const getTweet = async (args: { tweet_id: string }) => {
  try {
    const client = getTwitterClient();
    const tweetId = args.tweet_id;

    console.error(`🔍 Fetching tweet ${tweetId}...`);

    const tweet = await client.getTweet(tweetId);

    const result = {
      id: tweet.id,
      text: tweet.text,
      author_id: tweet.author_id,
      created_at: tweet.created_at,
      public_metrics: tweet.public_metrics,
      in_reply_to_user_id: tweet.in_reply_to_user_id,
      referenced_tweets: tweet.referenced_tweets,
      url: `https://twitter.com/i/web/status/${tweet.id}`,
    };

    console.error(`✅ Retrieved tweet ${tweetId}`);

    return formatTextResult(JSON.stringify(result, null, 2));
  } catch (error: any) {
    console.error(`❌ Error fetching tweet:`, error.message);
    return formatErrorResult(error.message);
  }
};

/**
 * Get user timeline (tweets by a user)
 */
const getUserTimeline = async (args: {
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

    console.error(`🔍 Fetching timeline for @${username}...`);

    // First get user ID from username
    const user = await client.getUserByUsername(username);
    const userId = user.id;

    // Then get timeline
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

    console.error(`✅ Retrieved ${timeline.data.length} tweets from @${username}`);

    return formatTextResult(JSON.stringify(result, null, 2));
  } catch (error: any) {
    console.error(`❌ Error fetching user timeline:`, error.message);
    return formatErrorResult(error.message);
  }
};

// Tool definitions
export const tweetTools: MCPToolDefinition[] = [
  {
    name: 'twitter_get_tweet',
    description:
      'Fetch detailed information about a specific tweet by its ID, including text, author, metrics (likes, retweets, replies), timestamps, and metadata. Useful for retrieving complete tweet details when you have the tweet ID.',
    inputSchema: {
      type: 'object',
      properties: {
        tweet_id: {
          type: 'string',
          description: 'Tweet ID (can be just the ID string)',
        },
      },
      required: ['tweet_id'],
    },
    handler: getTweet,
  },
  {
    name: 'twitter_get_user_timeline',
    description:
      'Retrieve tweets from a specific user\'s timeline. Supports pagination for browsing through multiple pages of results. Perfect for exploring user content or monitoring specific accounts.',
    inputSchema: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          description: 'Twitter username (e.g., "twitter" or "@twitter")',
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
    handler: getUserTimeline,
  },
];

