/**
 * MCP (Model Context Protocol) Type Definitions
 */

// MCP Tool Result Content
export interface MCPTextContent {
  type: 'text';
  text: string;
}

export interface MCPImageContent {
  type: 'image';
  data: string;
  mimeType: string;
}

export type MCPContent = MCPTextContent | MCPImageContent;

// MCP Tool Result
export interface MCPResult {
  content: MCPContent[];
  isError?: boolean;
}

// MCP Tool Input Schema Property
export interface MCPInputProperty {
  type: string;
  description: string;
  default?: any;
  enum?: string[];
  items?: MCPInputProperty;
  properties?: { [key: string]: MCPInputProperty };
  required?: string[];
}

// MCP Tool Input Schema
export interface MCPInputSchema {
  type: 'object';
  properties: { [key: string]: MCPInputProperty };
  required?: string[];
}

// MCP Tool Definition
export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: MCPInputSchema;
  handler: (args: any) => Promise<MCPResult>;
}

// MCP Tool Arguments (generic)
export interface MCPToolArgs {
  [key: string]: any;
}

// Twitter-specific tool argument interfaces
export interface GetUserTimelineArgs extends MCPToolArgs {
  username: string;
  max_results?: number;
  since_id?: string;
  until_id?: string;
  pagination_token?: string;
}

export interface SearchTweetsArgs extends MCPToolArgs {
  query: string;
  max_results?: number;
  since_id?: string;
  until_id?: string;
  next_token?: string;
  start_time?: string;
  end_time?: string;
}

export interface GetUserInfoArgs extends MCPToolArgs {
  username: string;
}

export interface PostTweetArgs extends MCPToolArgs {
  text: string;
  reply_to_tweet_id?: string;
  exclude_reply_user_ids?: string[];
}

export interface ReplyToTweetArgs extends MCPToolArgs {
  tweet_id: string;
  text: string;
  exclude_reply_user_ids?: string[];
}

export interface LikeTweetArgs extends MCPToolArgs {
  tweet_id: string;
}

export interface RetweetArgs extends MCPToolArgs {
  tweet_id: string;
}

export interface DeleteTweetArgs extends MCPToolArgs {
  tweet_id: string;
}

// MCP Server Configuration
export interface MCPServerConfig {
  name: string;
  version: string;
}

// MCP Error Response
export interface MCPError {
  code: number;
  message: string;
  data?: any;
}
