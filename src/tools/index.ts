/**
 * Tools Registry - combines all Twitter tool modules
 */

import { tweetTools } from './tweets';
import { searchTools } from './search';
import { userTools } from './users';
import { postingTools } from './posting';
import { ToolDefinition } from '../types';

export const allTools: ToolDefinition[] = [
  ...tweetTools,
  ...searchTools,
  ...userTools,
  ...postingTools,
];
