/**
 * Type Definitions
 */

// Tool Result Content
export interface TextContent {
  type: 'text';
  text: string;
}

export type ToolContent = TextContent;

// Tool Result
export interface ToolResult {
  content: ToolContent[];
  isError?: boolean;
}

// Tool Input Schema Property
export interface InputProperty {
  type: string;
  description: string;
  default?: any;
  enum?: string[];
  items?: InputProperty;
  properties?: { [key: string]: InputProperty };
  required?: string[];
}

// Tool Input Schema
export interface InputSchema {
  type: 'object';
  properties: { [key: string]: InputProperty };
  required?: string[];
}

// Tool Definition
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: InputSchema;
  handler: (args: any) => Promise<ToolResult>;
}

// Tool Arguments (generic)
export interface ToolArgs {
  [key: string]: any;
}

// Twitter-specific tool argument interfaces
export interface GetUserTimelineArgs extends ToolArgs {
  username: string;
  max_results?: number;
  since_id?: string;
  until_id?: string;
  pagination_token?: string;
}

export interface SearchTweetsArgs extends ToolArgs {
  query: string;
  max_results?: number;
  since_id?: string;
  until_id?: string;
  next_token?: string;
  start_time?: string;
  end_time?: string;
}

export interface GetUserInfoArgs extends ToolArgs {
  username: string;
}

export interface PostTweetArgs extends ToolArgs {
  text: string;
  reply_to_tweet_id?: string;
  exclude_reply_user_ids?: string[];
}

export interface ReplyToTweetArgs extends ToolArgs {
  tweet_id: string;
  text: string;
  exclude_reply_user_ids?: string[];
}

export interface LikeTweetArgs extends ToolArgs {
  tweet_id: string;
}

export interface RetweetArgs extends ToolArgs {
  tweet_id: string;
}

export interface DeleteTweetArgs extends ToolArgs {
  tweet_id: string;
}
