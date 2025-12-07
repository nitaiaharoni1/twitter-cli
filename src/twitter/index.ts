/**
 * Twitter Connection Manager
 * Manages Twitter API client initialization and connection
 */

import { TwitterClient, TwitterConfig } from './client';
import * as dotenv from 'dotenv';

dotenv.config();

let twitterClient: TwitterClient | null = null;

/**
 * Initialize Twitter client with configuration
 */
export function initializeTwitter(config?: Partial<TwitterConfig>): TwitterClient {
  const apiKey = config?.apiKey || process.env.TWITTER_API_KEY;
  const apiSecret = config?.apiSecret || process.env.TWITTER_API_SECRET;
  const accessToken = config?.accessToken || process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = config?.accessSecret || process.env.TWITTER_ACCESS_SECRET;
  const bearerToken = config?.bearerToken || process.env.TWITTER_BEARER_TOKEN;

  if (!apiKey || !apiSecret) {
    throw new Error(
      'Twitter credentials not found. Please set TWITTER_API_KEY and TWITTER_API_SECRET environment variables.'
    );
  }

  const twitterConfig: TwitterConfig = {
    apiKey,
    apiSecret,
    accessToken,
    accessSecret,
    bearerToken,
  };

  twitterClient = new TwitterClient(twitterConfig);
  return twitterClient;
}

/**
 * Get the current Twitter client instance
 */
export function getTwitterClient(): TwitterClient {
  if (!twitterClient) {
    return initializeTwitter();
  }
  return twitterClient;
}

/**
 * Check if Twitter client is initialized
 */
export function isTwitterConnected(): boolean {
  return twitterClient !== null;
}

/**
 * Reset Twitter client connection
 */
export function resetTwitterConnection(): void {
  twitterClient = null;
}
