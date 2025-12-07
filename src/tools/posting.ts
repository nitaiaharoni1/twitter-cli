/**
 * Posting-related MCP tools (create, edit, delete tweets, likes, retweets)
 */

import { getTwitterClient } from '../twitter';
import { MCPToolDefinition, MCPResult } from '../types/mcp';
import { formatErrorResult, formatTextResult } from '../utils/result-formatter';

/**
 * Post a new tweet
 */
const postTweet = async (args: {
  text: string;
  reply_to_tweet_id?: string;
  exclude_reply_user_ids?: string[];
}) => {
  try {
    const client = getTwitterClient();

    // Validate required fields
    if (!args.text || args.text.trim().length === 0) {
      throw new Error('Tweet text is required');
    }

    if (args.text.length > 280) {
      throw new Error('Tweet text must be 280 characters or less (or upgrade to premium for 4000 characters)');
    }

    console.error(`📝 Posting tweet...`);

    const tweet = await client.postTweet(args.text, {
      replyToTweetId: args.reply_to_tweet_id,
      excludeReplyUserIds: args.exclude_reply_user_ids,
    });

    const result = {
      success: true,
      tweet_id: tweet.id,
      text: tweet.text,
      created_at: tweet.created_at,
      public_metrics: tweet.public_metrics,
      url: `https://twitter.com/i/web/status/${tweet.id}`,
    };

    console.error(`✅ Tweet posted successfully: ${tweet.id}`);

    return formatTextResult(JSON.stringify(result, null, 2));
  } catch (error: any) {
    console.error(`❌ Error posting tweet:`, error.message);
    return formatErrorResult(error.message);
  }
};

/**
 * Reply to a tweet
 */
const replyToTweet = async (args: {
  tweet_id: string;
  text: string;
  exclude_reply_user_ids?: string[];
}) => {
  try {
    const client = getTwitterClient();

    if (!args.text || args.text.trim().length === 0) {
      throw new Error('Reply text is required');
    }

    if (args.text.length > 280) {
      throw new Error('Reply text must be 280 characters or less (or upgrade to premium for 4000 characters)');
    }

    console.error(`💬 Replying to tweet ${args.tweet_id}...`);

    const tweet = await client.replyToTweet(
      args.tweet_id,
      args.text,
      args.exclude_reply_user_ids
    );

    const result = {
      success: true,
      tweet_id: tweet.id,
      text: tweet.text,
      created_at: tweet.created_at,
      public_metrics: tweet.public_metrics,
      in_reply_to_user_id: tweet.in_reply_to_user_id,
      url: `https://twitter.com/i/web/status/${tweet.id}`,
    };

    console.error(`✅ Reply posted successfully: ${tweet.id}`);

    return formatTextResult(JSON.stringify(result, null, 2));
  } catch (error: any) {
    console.error(`❌ Error replying to tweet:`, error.message);
    return formatErrorResult(error.message);
  }
};

/**
 * Like a tweet
 */
const likeTweet = async (args: { tweet_id: string }) => {
  try {
    const client = getTwitterClient();

    // Get current user ID
    const me = await client.getMe();
    const userId = me.id;

    console.error(`👍 Liking tweet ${args.tweet_id}...`);

    const result = await client.likeTweet(userId, args.tweet_id);

    const response = {
      success: true,
      tweet_id: args.tweet_id,
      liked: result.liked,
    };

    console.error(`✅ Successfully liked tweet ${args.tweet_id}`);

    return formatTextResult(JSON.stringify(response, null, 2));
  } catch (error: any) {
    console.error(`❌ Error liking tweet:`, error.message);
    return formatErrorResult(error.message);
  }
};

/**
 * Unlike a tweet
 */
const unlikeTweet = async (args: { tweet_id: string }) => {
  try {
    const client = getTwitterClient();

    // Get current user ID
    const me = await client.getMe();
    const userId = me.id;

    console.error(`👎 Unliking tweet ${args.tweet_id}...`);

    const result = await client.unlikeTweet(userId, args.tweet_id);

    const response = {
      success: true,
      tweet_id: args.tweet_id,
      liked: result.liked,
    };

    console.error(`✅ Successfully unliked tweet ${args.tweet_id}`);

    return formatTextResult(JSON.stringify(response, null, 2));
  } catch (error: any) {
    console.error(`❌ Error unliking tweet:`, error.message);
    return formatErrorResult(error.message);
  }
};

/**
 * Retweet a tweet
 */
const retweet = async (args: { tweet_id: string }) => {
  try {
    const client = getTwitterClient();

    // Get current user ID
    const me = await client.getMe();
    const userId = me.id;

    console.error(`🔄 Retweeting tweet ${args.tweet_id}...`);

    const result = await client.retweet(userId, args.tweet_id);

    const response = {
      success: true,
      tweet_id: args.tweet_id,
      retweeted: result.retweeted,
    };

    console.error(`✅ Successfully retweeted tweet ${args.tweet_id}`);

    return formatTextResult(JSON.stringify(response, null, 2));
  } catch (error: any) {
    console.error(`❌ Error retweeting:`, error.message);
    return formatErrorResult(error.message);
  }
};

/**
 * Unretweet a tweet
 */
const unretweet = async (args: { tweet_id: string }) => {
  try {
    const client = getTwitterClient();

    // Get current user ID
    const me = await client.getMe();
    const userId = me.id;

    console.error(`🔄 Unretweeting tweet ${args.tweet_id}...`);

    const result = await client.unretweet(userId, args.tweet_id);

    const response = {
      success: true,
      tweet_id: args.tweet_id,
      retweeted: result.retweeted,
    };

    console.error(`✅ Successfully unretweeted tweet ${args.tweet_id}`);

    return formatTextResult(JSON.stringify(response, null, 2));
  } catch (error: any) {
    console.error(`❌ Error unretweeting:`, error.message);
    return formatErrorResult(error.message);
  }
};

/**
 * Delete a tweet
 */
const deleteTweet = async (args: { tweet_id: string }) => {
  try {
    const client = getTwitterClient();

    console.error(`🗑️ Deleting tweet ${args.tweet_id}...`);

    const result = await client.deleteTweet(args.tweet_id);

    const response = {
      success: true,
      tweet_id: args.tweet_id,
      deleted: result.deleted,
    };

    console.error(`✅ Successfully deleted tweet ${args.tweet_id}`);

    return formatTextResult(JSON.stringify(response, null, 2));
  } catch (error: any) {
    console.error(`❌ Error deleting tweet:`, error.message);
    return formatErrorResult(error.message);
  }
};

// Tool definitions
export const postingTools: MCPToolDefinition[] = [
  {
    name: 'twitter_post_tweet',
    description:
      'Post a new tweet. Requires user authentication (TWITTER_ACCESS_TOKEN and TWITTER_ACCESS_SECRET). Can optionally reply to an existing tweet. Free tier allows up to 1,500 tweets per month.',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'Tweet text content (required, max 280 characters, or 4000 for premium accounts)',
        },
        reply_to_tweet_id: {
          type: 'string',
          description: 'Optional: Tweet ID to reply to (makes this a reply tweet)',
        },
        exclude_reply_user_ids: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'Optional: Array of user IDs to exclude from reply notifications',
        },
      },
      required: ['text'],
    },
    handler: postTweet,
  },
  {
    name: 'twitter_reply_to_tweet',
    description:
      'Reply to an existing tweet. Requires user authentication (TWITTER_ACCESS_TOKEN and TWITTER_ACCESS_SECRET).',
    inputSchema: {
      type: 'object',
      properties: {
        tweet_id: {
          type: 'string',
          description: 'Tweet ID to reply to',
        },
        text: {
          type: 'string',
          description: 'Reply text content (required, max 280 characters, or 4000 for premium accounts)',
        },
        exclude_reply_user_ids: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'Optional: Array of user IDs to exclude from reply notifications',
        },
      },
      required: ['tweet_id', 'text'],
    },
    handler: replyToTweet,
  },
  {
    name: 'twitter_like_tweet',
    description:
      'Like a tweet. Requires user authentication (TWITTER_ACCESS_TOKEN and TWITTER_ACCESS_SECRET).',
    inputSchema: {
      type: 'object',
      properties: {
        tweet_id: {
          type: 'string',
          description: 'Tweet ID to like',
        },
      },
      required: ['tweet_id'],
    },
    handler: likeTweet,
  },
  {
    name: 'twitter_unlike_tweet',
    description:
      'Remove a like from a tweet. Requires user authentication (TWITTER_ACCESS_TOKEN and TWITTER_ACCESS_SECRET).',
    inputSchema: {
      type: 'object',
      properties: {
        tweet_id: {
          type: 'string',
          description: 'Tweet ID to unlike',
        },
      },
      required: ['tweet_id'],
    },
    handler: unlikeTweet,
  },
  {
    name: 'twitter_retweet',
    description:
      'Retweet a tweet. Requires user authentication (TWITTER_ACCESS_TOKEN and TWITTER_ACCESS_SECRET).',
    inputSchema: {
      type: 'object',
      properties: {
        tweet_id: {
          type: 'string',
          description: 'Tweet ID to retweet',
        },
      },
      required: ['tweet_id'],
    },
    handler: retweet,
  },
  {
    name: 'twitter_unretweet',
    description:
      'Remove a retweet. Requires user authentication (TWITTER_ACCESS_TOKEN and TWITTER_ACCESS_SECRET).',
    inputSchema: {
      type: 'object',
      properties: {
        tweet_id: {
          type: 'string',
          description: 'Tweet ID to unretweet',
        },
      },
      required: ['tweet_id'],
    },
    handler: unretweet,
  },
  {
    name: 'twitter_delete_tweet',
    description:
      'Delete a tweet. Requires user authentication (TWITTER_ACCESS_TOKEN and TWITTER_ACCESS_SECRET). Can only delete your own tweets.',
    inputSchema: {
      type: 'object',
      properties: {
        tweet_id: {
          type: 'string',
          description: 'Tweet ID to delete',
        },
      },
      required: ['tweet_id'],
    },
    handler: deleteTweet,
  },
];
