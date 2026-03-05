/**
 * 24h UTC-aware deduplication cache
 *
 * The X API deduplicates charges within a 24-hour UTC day window: fetching
 * the same tweet/user ID more than once in the same UTC day costs nothing
 * extra.  This cache mirrors those semantics locally so CLI commands never
 * make redundant API calls.
 *
 * Storage: ~/.twitter-cli/cache.json  (mode 600, written on every mutation)
 * Eviction: entries whose UTC-date tag != today are dropped on every read.
 *           The file self-prunes on first use each day.
 *
 * User objects are stored under two keys: numeric ID and lowercase username.
 * That way both getUserById() and getUserByUsername() are cache hits after
 * the first fetch.
 *
 * Special sentinel key '__me__' stores the authenticated user so repeated
 * process invocations within the same UTC day never re-fetch it.
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
 * Drop entries that belong to a different UTC day.
 * Called on every read so stale data never leaks into results.
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

// In-process store — loaded once per process and kept in memory to avoid
// repeated disk reads within a single CLI invocation.
let _store: CacheStore | null = null;

function getStore(): CacheStore {
  if (!_store) {
    _store = pruneStale(readStore());
  }
  return _store;
}

function persistStore(): void {
  if (_store) writeStore(_store);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getCachedTweet(id: string): TwitterTweet | null {
  return getStore().tweets[id]?.data ?? null;
}

export function cacheTweet(tweet: TwitterTweet): void {
  const store = getStore();
  store.tweets[tweet.id] = { utcDate: todayUtc(), data: tweet };
  persistStore();
}

export function cacheTweets(tweets: TwitterTweet[]): void {
  if (tweets.length === 0) return;
  const store = getStore();
  const today = todayUtc();
  for (const tweet of tweets) {
    store.tweets[tweet.id] = { utcDate: today, data: tweet };
  }
  persistStore();
}

export function getCachedUser(idOrUsername: string): TwitterUser | null {
  const key = idOrUsername.replace(/^@/, '').toLowerCase();
  return getStore().users[key]?.data ?? null;
}

export function cacheUser(user: TwitterUser): void {
  const store = getStore();
  const today = todayUtc();
  const entry: CacheEntry<TwitterUser> = { utcDate: today, data: user };
  // Store under both numeric ID and lowercase username for fast two-way lookup
  store.users[user.id] = entry;
  if (user.username !== '__me__') {
    store.users[user.username.toLowerCase()] = entry;
  }
  persistStore();
}

export function cacheUsers(users: TwitterUser[]): void {
  if (users.length === 0) return;
  const store = getStore();
  const today = todayUtc();
  for (const user of users) {
    const entry: CacheEntry<TwitterUser> = { utcDate: today, data: user };
    store.users[user.id] = entry;
    if (user.username !== '__me__') {
      store.users[user.username.toLowerCase()] = entry;
    }
  }
  persistStore();
}

/**
 * Return tweet IDs not present in today's cache.
 */
export function uncachedTweetIds(ids: string[]): string[] {
  const store = getStore();
  return ids.filter((id) => !store.tweets[id]);
}

/**
 * Return usernames (lowercase, no @) not present in today's cache.
 */
export function uncachedUsernames(usernames: string[]): string[] {
  const store = getStore();
  return usernames
    .map((u) => u.replace(/^@/, '').toLowerCase())
    .filter((u) => !store.users[u]);
}

export function getCacheStats(): { tweets: number; users: number; utcDate: string } {
  const store = getStore();
  // Users are stored under both ID and username — count distinct data objects
  const seen = new Set<TwitterUser>();
  for (const entry of Object.values(store.users)) seen.add(entry.data);
  return {
    tweets: Object.keys(store.tweets).length,
    users: seen.size,
    utcDate: todayUtc(),
  };
}

export function clearCache(): void {
  _store = null;
  if (fs.existsSync(CACHE_FILE)) {
    fs.unlinkSync(CACHE_FILE);
  }
}

export function getCacheFilePath(): string {
  return CACHE_FILE;
}
