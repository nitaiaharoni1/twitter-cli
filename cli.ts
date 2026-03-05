#!/usr/bin/env node

import { Command } from 'commander';
import { initializeTwitter } from './src/twitter';
import * as dotenv from 'dotenv';

dotenv.config();

// Type declaration for build-time injected constants
declare const __PACKAGE_VERSION__: string;
const version = typeof __PACKAGE_VERSION__ !== 'undefined' ? __PACKAGE_VERSION__ : '1.0.0';

// Initialize Twitter client eagerly
try {
  initializeTwitter();
} catch (error: any) {
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
  .description('Command-line interface for the Twitter API')
  .version(version, '-v, --version');

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
