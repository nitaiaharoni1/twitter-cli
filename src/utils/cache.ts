/**
 * 24h UTC-aware deduplication cache
 *
 * The X API deduplicates charges within a 24-hour UTC day window: fetching
 * the same tweet/user ID more than once in the same UTC day costs nothing
 * extra.  This cache mirrors that semantics locally so CLI commands that
 * run multiple times in a day (or internally resolve the same user/tweet
 * more than once in a single command) never make redundant API calls.
 *
 * Storage: ~/.twitter-cli/cache.json  (written atomically, mode 600)
 * Eviction: any entry whose UTC-date tag != today is silently dropped on
 *            read, so the file self-prunes on first use each day.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { TwitterTweet, TwitterUser } from '../twitter/client';

const CACHE_DIR = path.join(os.homedir(), '.twitter-cli');
const CACHE_FILE = path.join(CACHE_DIR, 'cache.json');

interface CacheEntry<T> {
  utcDate: string; // YYYY-MM-DD
  data: T;
}

interface CacheStore {
  tweets: Record<string, CacheEntry<TwitterTweet>>;
  users: Record<string, CacheEntry<TwitterUser>>;
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function readStore(): CacheStore {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
      return JSON.parse(raw) as CacheStore;
    }
  } catch {
    // Corrupt or missing — start fresh
  }
  return { tweets: {}, users: {} };
}

function writeStore(store: CacheStore): void {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(store), { mode: 0o600 });
  } catch {
    // Cache write failure is non-fatal
  }
}

/**
 * Prune entries that belong to a different UTC day and return the cleaned
 * store.  Called on every read so stale data never leaks into results.
 */
function pruneStale(store: CacheStore): CacheStore {
  const today = todayUtc();
  const pruned: CacheStore = { tweets: {}, users: {} };
  for (const [id, entry] of Object.entries(store.tweets)) {
    if (entry.utcDate === today) pruned.tweets[id] = entry;
  }
  for (const [id, entry] of Object.entries(store.users)) {
    if (entry.utcDate === today) pruned.users[id] = entry;
  }
  return pruned;
}

function loadStore(): CacheStore {
  return pruneStale(readStore());
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getCachedTweet(id: string): TwitterTweet | null {
  const store = loadStore();
  return store.tweets[id]?.data ?? null;
}

export function cacheTweet(tweet: TwitterTweet): void {
  const store = loadStore();
  store.tweets[tweet.id] = { utcDate: todayUtc(), data: tweet };
  writeStore(store);
}

export function cacheTweets(tweets: TwitterTweet[]): void {
  if (tweets.length === 0) return;
  const store = loadStore();
  const today = todayUtc();
  for (const tweet of tweets) {
    store.tweets[tweet.id] = { utcDate: today, data: tweet };
  }
  writeStore(store);
}

export function getCachedUser(idOrUsername: string): TwitterUser | null {
  const store = loadStore();
  const key = idOrUsername.replace(/^@/, '').toLowerCase();
  // Check both numeric-ID key and lowercased-username key
  return store.users[key]?.data ?? null;
}

export function cacheUser(user: TwitterUser): void {
  const store = loadStore();
  const today = todayUtc();
  // Store under both the numeric ID and the lowercased username so either
  // lookup hits the cache.
  const entry: CacheEntry<TwitterUser> = { utcDate: today, data: user };
  store.users[user.id] = entry;
  store.users[user.username.toLowerCase()] = entry;
  writeStore(store);
}

/**
 * Given a list of tweet IDs, return which ones are missing from today's
 * cache and therefore need to be fetched from the API.
 */
export function uncachedTweetIds(ids: string[]): string[] {
  const store = loadStore();
  return ids.filter((id) => !store.tweets[id]);
}

export function getCacheStats(): { tweets: number; users: number; utcDate: string } {
  const store = loadStore();
  return {
    tweets: Object.keys(store.tweets).length,
    users: Math.floor(Object.keys(store.users).length / 2), // stored under 2 keys each
    utcDate: todayUtc(),
  };
}

export function clearCache(): void {
  if (fs.existsSync(CACHE_FILE)) {
    fs.unlinkSync(CACHE_FILE);
  }
}

export function getCacheFilePath(): string {
  return CACHE_FILE;
}
