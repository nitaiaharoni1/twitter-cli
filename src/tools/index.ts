/**
 * MCP Tools Registry - combines all Twitter tool modules
 */

import { isTwitterConnected } from '../twitter';
import { tweetTools } from './tweets';
import { searchTools } from './search';
import { userTools } from './users';
import { postingTools } from './posting';
import { MCPToolDefinition, MCPResult } from '../types/mcp';

// Combine all tools
const allTools: MCPToolDefinition[] = [
  ...tweetTools,
  ...searchTools,
  ...userTools,
  ...postingTools,
];

/**
 * Get all available tools for MCP server registration
 * @returns Array of tool definitions
 */
export const getToolDefinitions = () => {
  return allTools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
  }));
};

/**
 * Handle MCP tool call requests
 * @param request - MCP tool call request
 * @returns Tool response in MCP format
 */
export const handleToolCall = async (request: any) => {
  const { name, arguments: args } = request.params;

  if (!isTwitterConnected()) {
    return {
      content: [
        {
          type: 'text',
          text: 'Error: Twitter connection not established. Please check your configuration (TWITTER_API_KEY, TWITTER_API_SECRET).',
        },
      ],
      isError: true,
    };
  }

  try {
    // Find the tool handler
    const tool = allTools.find((t) => t.name === name);

    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }

    // Execute the tool handler
    const result = await tool.handler(args);
    return result;
  } catch (error) {
    console.error(`❌ Error in ${name}:`, (error as Error).message);

    return {
      content: [
        {
          type: 'text',
          text: `Error: ${(error as Error).message}`,
        },
      ],
      isError: true,
    };
  }
};
