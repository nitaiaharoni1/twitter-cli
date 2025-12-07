/**
 * Search-related MCP tools
 */

import { getTwitterClient } from '../twitter';
import { MCPToolDefinition, MCPResult } from '../types/mcp';
import { formatErrorResult, formatTextResult } from '../utils/result-formatter';

/**
 * Search tweets
 */
const searchTweets = async (args: {
  query: string;
  max_results?: number;
  since_id?: string;
  until_id?: string;
  next_token?: string;
  start_time?: string;
  end_time?: string;
}) => {
  try {
    const client = getTwitterClient();
    const query = args.query;
    const maxResults = Math.min(args.max_results || 10, 100);

    console.error(`🔍 Searching Twitter for: "${query}"...`);

    const response = await client.searchTweets(query, {
      maxResults,
      sinceId: args.since_id,
      untilId: args.until_id,
      nextToken: args.next_token,
      startTime: args.start_time,
      endTime: args.end_time,
    });

    const result = {
      query,
      tweets: response.data.map((tweet) => ({
        id: tweet.id,
        text: tweet.text,
        author_id: tweet.author_id,
        created_at: tweet.created_at,
        public_metrics: tweet.public_metrics,
        in_reply_to_user_id: tweet.in_reply_to_user_id,
        referenced_tweets: tweet.referenced_tweets,
        url: `https://twitter.com/i/web/status/${tweet.id}`,
      })),
      pagination: {
        next_token: response.meta.next_token,
        result_count: response.meta.result_count,
        newest_id: response.meta.newest_id,
        oldest_id: response.meta.oldest_id,
      },
    };

    console.error(`✅ Found ${response.data.length} tweets`);

    return formatTextResult(JSON.stringify(result, null, 2));
  } catch (error: any) {
    console.error(`❌ Error searching Twitter:`, error.message);
    return formatErrorResult(error.message);
  }
};

// Tool definitions
export const searchTools: MCPToolDefinition[] = [
  {
    name: 'search_tweets',
    description:
      'Search Twitter for tweets matching a query string. Supports advanced query operators and time-based filtering. Includes pagination for browsing through large result sets. ⚠️ Requires Basic tier ($100/mo) or higher - Free tier does not include search functionality. Essential for finding specific content, discussions, or information on Twitter.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query string (supports Twitter query operators like from:, has:media, -is:retweet, etc.)',
        },
        max_results: {
          type: 'number',
          description: 'Number of results to retrieve (1-100, default: 10)',
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
        next_token: {
          type: 'string',
          description: 'Pagination token from previous response to get next page of results',
        },
        start_time: {
          type: 'string',
          description: 'YYYY-MM-DDTHH:mm:ssZ format - oldest UTC timestamp from which tweets will be provided',
        },
        end_time: {
          type: 'string',
          description: 'YYYY-MM-DDTHH:mm:ssZ format - newest UTC timestamp to which tweets will be provided',
        },
      },
      required: ['query'],
    },
    handler: searchTweets,
  },
];
