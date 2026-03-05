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

  // A bearer token alone is sufficient for all read operations.
  // API key + secret are only needed when no bearer token is present (app-only auth fallback)
  // or when write operations are required.
  if (!bearerToken && (!apiKey || !apiSecret)) {
    throw new Error(
      'Twitter credentials not found. Please set TWITTER_BEARER_TOKEN (for read operations) ' +
      'or TWITTER_API_KEY + TWITTER_API_SECRET. Use `twitter-cli auth set` to configure.'
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
