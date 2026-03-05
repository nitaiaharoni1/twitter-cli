/**
 * Follow/unfollow and profile-update MCP tools
 */

import { getTwitterClient } from '../twitter';
import { ToolDefinition } from '../types';
import { formatErrorResult, formatTextResult } from '../utils/result-formatter';

const followUser = async (args: { username: string }) => {
  try {
    const client = getTwitterClient();

    const me = await client.getMe();
    const target = await client.getUserByUsername(args.username);

    console.error(`➕ Following @${target.username}...`);

    const result = await client.followUser(me.id, target.id);

    const response = {
      success: true,
      following: result.following,
      user: {
        id: target.id,
        username: target.username,
        name: target.name,
      },
    };

    console.error(`✅ Now following @${target.username}`);

    return formatTextResult(JSON.stringify(response, null, 2));
  } catch (error: any) {
    console.error(`❌ Error following user:`, error.message);
    return formatErrorResult(error.message);
  }
};

const unfollowUser = async (args: { username: string }) => {
  try {
    const client = getTwitterClient();

    const me = await client.getMe();
    const target = await client.getUserByUsername(args.username);

    console.error(`➖ Unfollowing @${target.username}...`);

    const result = await client.unfollowUser(me.id, target.id);

    const response = {
      success: true,
      following: result.following,
      user: {
        id: target.id,
        username: target.username,
        name: target.name,
      },
    };

    console.error(`✅ Unfollowed @${target.username}`);

    return formatTextResult(JSON.stringify(response, null, 2));
  } catch (error: any) {
    console.error(`❌ Error unfollowing user:`, error.message);
    return formatErrorResult(error.message);
  }
};

const updateBio = async (args: { bio: string }) => {
  try {
    const client = getTwitterClient();

    if (args.bio.length > 160) {
      throw new Error('Bio must be 160 characters or less');
    }

    console.error(`✏️ Updating bio...`);

    const result = await client.updateBio(args.bio);

    const response = {
      success: true,
      description: result.description,
    };

    console.error(`✅ Bio updated successfully`);

    return formatTextResult(JSON.stringify(response, null, 2));
  } catch (error: any) {
    console.error(`❌ Error updating bio:`, error.message);
    return formatErrorResult(error.message);
  }
};

const blockUser = async (args: { username: string }) => {
  try {
    const client = getTwitterClient();

    const me = await client.getMe();
    const target = await client.getUserByUsername(args.username);

    console.error(`🚫 Blocking @${target.username}...`);

    const result = await client.blockUser(me.id, target.id);

    const response = {
      success: true,
      blocking: result.blocking,
      user: {
        id: target.id,
        username: target.username,
        name: target.name,
      },
    };

    console.error(`✅ Blocked @${target.username}`);

    return formatTextResult(JSON.stringify(response, null, 2));
  } catch (error: any) {
    console.error(`❌ Error blocking user:`, error.message);
    return formatErrorResult(error.message);
  }
};

const unblockUser = async (args: { username: string }) => {
  try {
    const client = getTwitterClient();

    const me = await client.getMe();
    const target = await client.getUserByUsername(args.username);

    console.error(`🔓 Unblocking @${target.username}...`);

    const result = await client.unblockUser(me.id, target.id);

    const response = {
      success: true,
      blocking: result.blocking,
      user: {
        id: target.id,
        username: target.username,
        name: target.name,
      },
    };

    console.error(`✅ Unblocked @${target.username}`);

    return formatTextResult(JSON.stringify(response, null, 2));
  } catch (error: any) {
    console.error(`❌ Error unblocking user:`, error.message);
    return formatErrorResult(error.message);
  }
};

const muteUser = async (args: { username: string }) => {
  try {
    const client = getTwitterClient();

    const me = await client.getMe();
    const target = await client.getUserByUsername(args.username);

    console.error(`🔇 Muting @${target.username}...`);

    const result = await client.muteUser(me.id, target.id);

    const response = {
      success: true,
      muting: result.muting,
      user: {
        id: target.id,
        username: target.username,
        name: target.name,
      },
    };

    console.error(`✅ Muted @${target.username}`);

    return formatTextResult(JSON.stringify(response, null, 2));
  } catch (error: any) {
    console.error(`❌ Error muting user:`, error.message);
    return formatErrorResult(error.message);
  }
};

const unmuteUser = async (args: { username: string }) => {
  try {
    const client = getTwitterClient();

    const me = await client.getMe();
    const target = await client.getUserByUsername(args.username);

    console.error(`🔊 Unmuting @${target.username}...`);

    const result = await client.unmuteUser(me.id, target.id);

    const response = {
      success: true,
      muting: result.muting,
      user: {
        id: target.id,
        username: target.username,
        name: target.name,
      },
    };

    console.error(`✅ Unmuted @${target.username}`);

    return formatTextResult(JSON.stringify(response, null, 2));
  } catch (error: any) {
    console.error(`❌ Error unmuting user:`, error.message);
    return formatErrorResult(error.message);
  }
};

const bookmarkTweet = async (args: { tweet_id: string }) => {
  try {
    const client = getTwitterClient();

    console.error(`🔖 Bookmarking tweet ${args.tweet_id}...`);

    const result = await client.bookmarkTweet(args.tweet_id);

    const response = {
      success: true,
      tweet_id: args.tweet_id,
      bookmarked: result.bookmarked,
    };

    console.error(`✅ Bookmarked tweet ${args.tweet_id}`);

    return formatTextResult(JSON.stringify(response, null, 2));
  } catch (error: any) {
    console.error(`❌ Error bookmarking tweet:`, error.message);
    return formatErrorResult(error.message);
  }
};

const unbookmarkTweet = async (args: { tweet_id: string }) => {
  try {
    const client = getTwitterClient();

    console.error(`🔖 Removing bookmark from tweet ${args.tweet_id}...`);

    const result = await client.unbookmarkTweet(args.tweet_id);

    const response = {
      success: true,
      tweet_id: args.tweet_id,
      bookmarked: result.bookmarked,
    };

    console.error(`✅ Removed bookmark from tweet ${args.tweet_id}`);

    return formatTextResult(JSON.stringify(response, null, 2));
  } catch (error: any) {
    console.error(`❌ Error removing bookmark:`, error.message);
    return formatErrorResult(error.message);
  }
};

const getBookmarks = async (args: { max_results?: number; pagination_token?: string }) => {
  try {
    const client = getTwitterClient();

    console.error(`🔖 Fetching bookmarks...`);

    const result = await client.getBookmarks({
      maxResults: args.max_results,
      paginationToken: args.pagination_token,
    });

    const response = {
      tweets: result.data,
      meta: result.meta,
    };

    console.error(`✅ Fetched ${result.data.length} bookmarked tweet(s)`);

    return formatTextResult(JSON.stringify(response, null, 2));
  } catch (error: any) {
    console.error(`❌ Error fetching bookmarks:`, error.message);
    return formatErrorResult(error.message);
  }
};

export const followTools: ToolDefinition[] = [
  {
    name: 'twitter_follow_user',
    description:
      'Follow a Twitter user. Requires user authentication (TWITTER_ACCESS_TOKEN and TWITTER_ACCESS_SECRET).',
    inputSchema: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          description: 'Twitter username to follow (with or without @)',
        },
      },
      required: ['username'],
    },
    handler: followUser,
  },
  {
    name: 'twitter_unfollow_user',
    description:
      'Unfollow a Twitter user. Requires user authentication (TWITTER_ACCESS_TOKEN and TWITTER_ACCESS_SECRET).',
    inputSchema: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          description: 'Twitter username to unfollow (with or without @)',
        },
      },
      required: ['username'],
    },
    handler: unfollowUser,
  },
  {
    name: 'twitter_update_bio',
    description:
      'Update your Twitter profile bio (description). Requires user authentication (TWITTER_ACCESS_TOKEN and TWITTER_ACCESS_SECRET). Max 160 characters.',
    inputSchema: {
      type: 'object',
      properties: {
        bio: {
          type: 'string',
          description: 'New bio text (max 160 characters)',
        },
      },
      required: ['bio'],
    },
    handler: updateBio,
  },
  {
    name: 'twitter_block_user',
    description:
      'Block a Twitter user. Requires user authentication (TWITTER_ACCESS_TOKEN and TWITTER_ACCESS_SECRET).',
    inputSchema: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          description: 'Twitter username to block (with or without @)',
        },
      },
      required: ['username'],
    },
    handler: blockUser,
  },
  {
    name: 'twitter_unblock_user',
    description:
      'Unblock a Twitter user. Requires user authentication (TWITTER_ACCESS_TOKEN and TWITTER_ACCESS_SECRET).',
    inputSchema: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          description: 'Twitter username to unblock (with or without @)',
        },
      },
      required: ['username'],
    },
    handler: unblockUser,
  },
  {
    name: 'twitter_mute_user',
    description:
      'Mute a Twitter user. Requires user authentication (TWITTER_ACCESS_TOKEN and TWITTER_ACCESS_SECRET).',
    inputSchema: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          description: 'Twitter username to mute (with or without @)',
        },
      },
      required: ['username'],
    },
    handler: muteUser,
  },
  {
    name: 'twitter_unmute_user',
    description:
      'Unmute a Twitter user. Requires user authentication (TWITTER_ACCESS_TOKEN and TWITTER_ACCESS_SECRET).',
    inputSchema: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          description: 'Twitter username to unmute (with or without @)',
        },
      },
      required: ['username'],
    },
    handler: unmuteUser,
  },
  {
    name: 'twitter_bookmark_tweet',
    description:
      'Bookmark a tweet. Requires user authentication (TWITTER_ACCESS_TOKEN and TWITTER_ACCESS_SECRET).',
    inputSchema: {
      type: 'object',
      properties: {
        tweet_id: {
          type: 'string',
          description: 'Tweet ID to bookmark',
        },
      },
      required: ['tweet_id'],
    },
    handler: bookmarkTweet,
  },
  {
    name: 'twitter_unbookmark_tweet',
    description:
      'Remove a bookmark from a tweet. Requires user authentication (TWITTER_ACCESS_TOKEN and TWITTER_ACCESS_SECRET).',
    inputSchema: {
      type: 'object',
      properties: {
        tweet_id: {
          type: 'string',
          description: 'Tweet ID to remove bookmark from',
        },
      },
      required: ['tweet_id'],
    },
    handler: unbookmarkTweet,
  },
  {
    name: 'twitter_get_bookmarks',
    description:
      'List your bookmarked tweets. Requires user authentication (TWITTER_ACCESS_TOKEN and TWITTER_ACCESS_SECRET).',
    inputSchema: {
      type: 'object',
      properties: {
        max_results: {
          type: 'number',
          description: 'Number of bookmarks to fetch (5-100, default 10)',
        },
        pagination_token: {
          type: 'string',
          description: 'Pagination token for next page',
        },
      },
    },
    handler: getBookmarks,
  },
];
