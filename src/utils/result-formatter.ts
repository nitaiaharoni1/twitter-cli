/**
 * Result Formatter
 * Centralized formatting for CLI tool responses
 */

import { ToolResult, ToolContent } from '../types';

/**
 * Format text result
 */
export function formatTextResult(text: string): ToolResult {
  const content: ToolContent[] = [
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
export function formatErrorResult(message: string): ToolResult {
  const content: ToolContent[] = [
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

