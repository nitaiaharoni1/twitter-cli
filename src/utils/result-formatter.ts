/**
 * MCP Result Formatter
 * Centralized formatting for MCP tool responses
 */

import { MCPResult, MCPContent } from '../types/mcp';

/**
 * Format text result
 */
export function formatTextResult(text: string): MCPResult {
  const content: MCPContent[] = [
    {
      type: 'text',
      text,
    },
  ];

  return { content };
}

/**
 * Format error MCP result
 */
export function formatErrorResult(message: string): MCPResult {
  const content: MCPContent[] = [
    {
      type: 'text',
      text: JSON.stringify(
        {
          success: false,
          error: message,
        },
        null,
        2,
      ),
    },
  ];

  return { content, isError: true };
}

