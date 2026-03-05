#!/usr/bin/env node

import { Command } from 'commander';
import * as dotenv from 'dotenv';
import {
  injectStoredCredentials,
  saveCredentials,
  loadStoredCredentials,
  clearCredentials,
  getConfigFilePath,
  StoredCredentials,
} from './src/config/credentials';

// Load .env first, then overlay stored global credentials (env vars win)
dotenv.config();
injectStoredCredentials();

import { initializeTwitter } from './src/twitter';

// Type declaration for build-time injected constants
declare const __PACKAGE_VERSION__: string;
const version = typeof __PACKAGE_VERSION__ !== 'undefined' ? __PACKAGE_VERSION__ : '1.0.0';

// Initialize Twitter client eagerly (soft fail — error surfaces per-command)
try {
  initializeTwitter();
} catch {
  // Will fail later with a clear message when a command is run
}

function printResult(result: { content: Array<{ type: string; text: string }>; isError?: boolean }) {
  const text = result.content.map((c) => c.text).join('\n');
  if (result.isError) {
    console.error(text);
    process.exit(1);
  } else {
    console.log(text);
  }
}

const program = new Command();

program
  .name('twitter-cli')
  .description('Command-line interface for the Twitter (X) API v2')
  .version(version, '-v, --version');

// ─── Auth commands ─────────────────────────────────────────────────────────────

const auth = program.command('auth').description('Manage API credentials stored globally on this machine');

auth
  .command('set')
  .description('Set one or more API credentials (stored in ~/.twitter-cli/config.json)')
  .option('--api-key <key>', 'Twitter API key (consumer key)')
  .option('--api-secret <secret>', 'Twitter API secret (consumer secret)')
  .option('--bearer-token <token>', 'Bearer token for read-only operations')
  .option('--access-token <token>', 'OAuth 1.0a access token (for write operations)')
  .option('--access-secret <secret>', 'OAuth 1.0a access token secret (for write operations)')
  .action((opts) => {
    const toSave: StoredCredentials = {};
    if (opts.apiKey) toSave.TWITTER_API_KEY = opts.apiKey;
    if (opts.apiSecret) toSave.TWITTER_API_SECRET = opts.apiSecret;
    if (opts.bearerToken) toSave.TWITTER_BEARER_TOKEN = opts.bearerToken;
    if (opts.accessToken) toSave.TWITTER_ACCESS_TOKEN = opts.accessToken;
    if (opts.accessSecret) toSave.TWITTER_ACCESS_SECRET = opts.accessSecret;

    if (Object.keys(toSave).length === 0) {
      console.error('No credentials provided. Use --api-key, --api-secret, --bearer-token, --access-token, or --access-secret.');
      process.exit(1);
    }

    saveCredentials(toSave);
    const keys = Object.keys(toSave).join(', ');
    console.log(`✅ Saved: ${keys}`);
    console.log(`   Config file: ${getConfigFilePath()}`);
  });

auth
  .command('show')
  .description('Show currently stored credentials (values are masked)')
  .action(() => {
    const stored = loadStoredCredentials();
    const keys: Array<keyof StoredCredentials> = [
      'TWITTER_API_KEY',
      'TWITTER_API_SECRET',
      'TWITTER_BEARER_TOKEN',
      'TWITTER_ACCESS_TOKEN',
      'TWITTER_ACCESS_SECRET',
    ];

    if (Object.keys(stored).length === 0) {
      console.log('No credentials stored. Use `twitter-cli auth set` to configure.');
      console.log(`Config file: ${getConfigFilePath()}`);
      return;
    }

    console.log(`Stored credentials (${getConfigFilePath()}):\n`);
    for (const key of keys) {
      const val = stored[key];
      if (val) {
        const masked = val.slice(0, 4) + '****' + val.slice(-4);
        console.log(`  ${key.padEnd(28)} ${masked}`);
      } else {
        const envVal = process.env[key];
        if (envVal) {
          console.log(`  ${key.padEnd(28)} (from environment variable)`);
        } else {
          console.log(`  ${key.padEnd(28)} (not set)`);
        }
      }
    }
  });

auth
  .command('clear')
  .description('Remove all stored credentials from this machine')
  .action(() => {
    clearCredentials();
    console.log(`✅ Credentials cleared (${getConfigFilePath()})`);
  });

// ─── Usage / rate limit command ───────────────────────────────────────────────

program
  .command('usage')
  .description('Show Twitter API tier limits and current credential status')
  .action(() => {
    const stored = loadStoredCredentials();
    const hasBearerToken = !!(process.env.TWITTER_BEARER_TOKEN || stored.TWITTER_BEARER_TOKEN);
    const hasApiKey = !!(process.env.TWITTER_API_KEY || stored.TWITTER_API_KEY);
    const hasApiSecret = !!(process.env.TWITTER_API_SECRET || stored.TWITTER_API_SECRET);
    const hasAccessToken = !!(process.env.TWITTER_ACCESS_TOKEN || stored.TWITTER_ACCESS_TOKEN);
    const hasAccessSecret = !!(process.env.TWITTER_ACCESS_SECRET || stored.TWITTER_ACCESS_SECRET);

    const readReady = hasBearerToken || (hasApiKey && hasApiSecret);
    const writeReady = hasApiKey && hasApiSecret && hasAccessToken && hasAccessSecret;

    console.log('Twitter API v2 — Credential Status\n');
    console.log(`  TWITTER_API_KEY         ${hasApiKey ? '✅ set' : '❌ missing'}`);
    console.log(`  TWITTER_API_SECRET      ${hasApiSecret ? '✅ set' : '❌ missing'}`);
    console.log(`  TWITTER_BEARER_TOKEN    ${hasBearerToken ? '✅ set' : '❌ missing'}`);
    console.log(`  TWITTER_ACCESS_TOKEN    ${hasAccessToken ? '✅ set' : '❌ missing'}`);
    console.log(`  TWITTER_ACCESS_SECRET   ${hasAccessSecret ? '✅ set' : '❌ missing'}`);
    console.log('');
    console.log(`  Read operations   ${readReady ? '✅ ready' : '❌ not configured'}`);
    console.log(`  Write operations  ${writeReady ? '✅ ready' : '❌ not configured'}`);

    console.log(`
Twitter API v2 Tier Limits (as of 2025)
────────────────────────────────────────────────────────────
Tier        Price      Post tweets/mo   Read tweets/mo   Search
────────────────────────────────────────────────────────────
Free        $0         1,500            10,000           ❌
Basic       $100/mo    3,000            1,000,000        ✅ (recent, 7 days)
Pro         $5,000/mo  300,000          1,000,000        ✅ (full archive)
Enterprise  Custom     Unlimited        Unlimited        ✅ (full archive)
────────────────────────────────────────────────────────────

Rate Limits (per 15-minute window, approximate)
  GET /tweets/:id            180 req  (app) / 900 req (user)
  GET /users/:id/tweets      1,500 req (app) / 900 req (user)
  GET /tweets/search/recent  450 req  (app) / 180 req (user)
  POST /tweets               200 req  (user)
  POST /users/:id/likes      1,000 req (user)
  POST /users/:id/retweets   50 req   (user)

Credentials are read from (in priority order):
  1. Environment variables (TWITTER_API_KEY, etc.)
  2. ~/.twitter-cli/config.json  (use \`twitter-cli auth set\`)
  3. .env file in current directory
`);
  });

// ─── Tweet commands ───────────────────────────────────────────────────────────

const tweet = program.command('tweet').description('Tweet operations');

tweet
  .command('get <tweet_id>')
  .description('Get a tweet by ID')
  .action(async (tweet_id: string) => {
    const { tweetTools } = await import('./src/tools/tweets');
    const handler = tweetTools.find((t) => t.name === 'twitter_get_tweet')!.handler;
    printResult(await handler({ tweet_id }));
  });

tweet
  .command('timeline <username>')
  .description("Get a user's timeline")
  .option('-n, --max-results <number>', 'Number of tweets to fetch (1-100)', '10')
  .option('--since-id <id>', 'Only tweets after this ID')
  .option('--until-id <id>', 'Only tweets before this ID')
  .option('--pagination-token <token>', 'Pagination token for next page')
  .action(async (username: string, opts) => {
    const { tweetTools } = await import('./src/tools/tweets');
    const handler = tweetTools.find((t) => t.name === 'twitter_get_user_timeline')!.handler;
    printResult(
      await handler({
        username,
        max_results: parseInt(opts.maxResults, 10),
        since_id: opts.sinceId,
        until_id: opts.untilId,
        pagination_token: opts.paginationToken,
      }),
    );
  });

tweet
  .command('mentions <username>')
  .description('Get tweets that mention a user')
  .option('-n, --max-results <number>', 'Number of mentions to fetch (1-100)', '10')
  .option('--since-id <id>', 'Only tweets after this ID')
  .option('--until-id <id>', 'Only tweets before this ID')
  .option('--pagination-token <token>', 'Pagination token for next page')
  .action(async (username: string, opts) => {
    const { userTools } = await import('./src/tools/users');
    const handler = userTools.find((t) => t.name === 'twitter_get_user_mentions')!.handler;
    printResult(
      await handler({
        username,
        max_results: parseInt(opts.maxResults, 10),
        since_id: opts.sinceId,
        until_id: opts.untilId,
        pagination_token: opts.paginationToken,
      }),
    );
  });

// ─── User commands ────────────────────────────────────────────────────────────

const user = program.command('user').description('User operations');

user
  .command('info <username>')
  .description('Get profile information for a user')
  .action(async (username: string) => {
    const { userTools } = await import('./src/tools/users');
    const handler = userTools.find((t) => t.name === 'twitter_get_user_info')!.handler;
    printResult(await handler({ username }));
  });

user
  .command('whoami')
  .description('Show the currently authenticated user (requires write credentials)')
  .action(async () => {
    const { userTools } = await import('./src/tools/users');
    const handler = userTools.find((t) => t.name === 'twitter_whoami')!.handler;
    printResult(await handler({} as any));
  });

user
  .command('tweets <username>')
  .description('Get tweets posted by a user')
  .option('-n, --max-results <number>', 'Number of tweets to fetch (1-100)', '10')
  .option('--since-id <id>', 'Only tweets after this ID')
  .option('--until-id <id>', 'Only tweets before this ID')
  .option('--pagination-token <token>', 'Pagination token for next page')
  .action(async (username: string, opts) => {
    const { userTools } = await import('./src/tools/users');
    const handler = userTools.find((t) => t.name === 'twitter_get_user_tweets')!.handler;
    printResult(
      await handler({
        username,
        max_results: parseInt(opts.maxResults, 10),
        since_id: opts.sinceId,
        until_id: opts.untilId,
        pagination_token: opts.paginationToken,
      }),
    );
  });

user
  .command('replies <username>')
  .description('Get replies made by a user')
  .option('-n, --max-results <number>', 'Number of replies to fetch (1-100)', '10')
  .option('--since-id <id>', 'Only tweets after this ID')
  .option('--until-id <id>', 'Only tweets before this ID')
  .option('--pagination-token <token>', 'Pagination token for next page')
  .action(async (username: string, opts) => {
    const { userTools } = await import('./src/tools/users');
    const handler = userTools.find((t) => t.name === 'twitter_get_user_replies')!.handler;
    printResult(
      await handler({
        username,
        max_results: parseInt(opts.maxResults, 10),
        since_id: opts.sinceId,
        until_id: opts.untilId,
        pagination_token: opts.paginationToken,
      }),
    );
  });

// ─── Search commands ──────────────────────────────────────────────────────────

const search = program.command('search').description('Search operations');

search
  .command('tweets <query>')
  .description('Search tweets (requires Basic tier $100/mo or higher)')
  .option('-n, --max-results <number>', 'Number of results to fetch (1-100)', '10')
  .option('--since-id <id>', 'Only tweets after this ID')
  .option('--until-id <id>', 'Only tweets before this ID')
  .option('--next-token <token>', 'Pagination token for next page')
  .option('--start-time <time>', 'Oldest timestamp (YYYY-MM-DDTHH:mm:ssZ)')
  .option('--end-time <time>', 'Newest timestamp (YYYY-MM-DDTHH:mm:ssZ)')
  .action(async (query: string, opts) => {
    const { searchTools } = await import('./src/tools/search');
    const handler = searchTools.find((t) => t.name === 'twitter_search_tweets')!.handler;
    printResult(
      await handler({
        query,
        max_results: parseInt(opts.maxResults, 10),
        since_id: opts.sinceId,
        until_id: opts.untilId,
        next_token: opts.nextToken,
        start_time: opts.startTime,
        end_time: opts.endTime,
      }),
    );
  });

// ─── Post commands ────────────────────────────────────────────────────────────

const post = program.command('post').description('Posting operations (requires OAuth 1.0a)');

post
  .command('tweet <text>')
  .description('Post a new tweet')
  .option('--reply-to <tweet_id>', 'Tweet ID to reply to')
  .action(async (text: string, opts) => {
    const { postingTools } = await import('./src/tools/posting');
    const handler = postingTools.find((t) => t.name === 'twitter_post_tweet')!.handler;
    printResult(await handler({ text, reply_to_tweet_id: opts.replyTo }));
  });

post
  .command('reply <tweet_id> <text>')
  .description('Reply to an existing tweet')
  .action(async (tweet_id: string, text: string) => {
    const { postingTools } = await import('./src/tools/posting');
    const handler = postingTools.find((t) => t.name === 'twitter_reply_to_tweet')!.handler;
    printResult(await handler({ tweet_id, text }));
  });

post
  .command('like <tweet_id>')
  .description('Like a tweet')
  .action(async (tweet_id: string) => {
    const { postingTools } = await import('./src/tools/posting');
    const handler = postingTools.find((t) => t.name === 'twitter_like_tweet')!.handler;
    printResult(await handler({ tweet_id }));
  });

post
  .command('unlike <tweet_id>')
  .description('Remove a like from a tweet')
  .action(async (tweet_id: string) => {
    const { postingTools } = await import('./src/tools/posting');
    const handler = postingTools.find((t) => t.name === 'twitter_unlike_tweet')!.handler;
    printResult(await handler({ tweet_id }));
  });

post
  .command('retweet <tweet_id>')
  .description('Retweet a tweet')
  .action(async (tweet_id: string) => {
    const { postingTools } = await import('./src/tools/posting');
    const handler = postingTools.find((t) => t.name === 'twitter_retweet')!.handler;
    printResult(await handler({ tweet_id }));
  });

post
  .command('unretweet <tweet_id>')
  .description('Remove a retweet')
  .action(async (tweet_id: string) => {
    const { postingTools } = await import('./src/tools/posting');
    const handler = postingTools.find((t) => t.name === 'twitter_unretweet')!.handler;
    printResult(await handler({ tweet_id }));
  });

post
  .command('delete <tweet_id>')
  .description('Delete a tweet (your own tweets only)')
  .action(async (tweet_id: string) => {
    const { postingTools } = await import('./src/tools/posting');
    const handler = postingTools.find((t) => t.name === 'twitter_delete_tweet')!.handler;
    printResult(await handler({ tweet_id }));
  });

program.parse(process.argv);
