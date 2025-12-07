#!/usr/bin/env ts-node

/**
 * Test script for Reddit MCP Server
 * Tests Reddit API client functionality
 */

import { initializeReddit, getRedditClient } from './src/reddit';

// Test configuration - uses environment variables
const REDDIT_CONFIG = {
  clientId: process.env.REDDIT_CLIENT_ID || '',
  clientSecret: process.env.REDDIT_CLIENT_SECRET || '',
  userAgent: process.env.REDDIT_USER_AGENT || 'reddit-mcp:1.0.0 (by /u/testuser)',
  username: process.env.REDDIT_USERNAME,
  password: process.env.REDDIT_PASSWORD,
};

if (!REDDIT_CONFIG.clientId || !REDDIT_CONFIG.clientSecret) {
  console.error('❌ Error: REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET environment variables are required');
  console.error('   Set them before running this test:');
  console.error('   export REDDIT_CLIENT_ID="your_client_id"');
  console.error('   export REDDIT_CLIENT_SECRET="your_client_secret"');
  console.error('   export REDDIT_USER_AGENT="reddit-mcp:1.0.0 (by /u/yourusername)"');
  process.exit(1);
}

async function testRedditConnection() {
  console.log('🧪 Testing Reddit MCP Server...\n');

  try {
    // Initialize Reddit client
    console.log('1️⃣  Initializing Reddit client...');
    const client = initializeReddit(REDDIT_CONFIG);
    console.log('   ✅ Client initialized\n');

    // Test 1: Get subreddit info
    console.log('2️⃣  Testing: Get subreddit info (r/programming)...');
    try {
      const subredditInfo = await client.getSubredditInfo('programming');
      console.log(`   ✅ Subreddit: r/${subredditInfo.display_name}`);
      console.log(`   ✅ Subscribers: ${subredditInfo.subscribers.toLocaleString()}`);
      console.log(`   ✅ Description: ${subredditInfo.public_description.substring(0, 100)}...\n`);
    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}\n`);
    }

    // Test 2: Get subreddit posts
    console.log('3️⃣  Testing: Get subreddit posts (r/programming, hot, limit 5)...');
    try {
      const posts = await client.getSubredditPosts('programming', 'hot', 5);
      console.log(`   ✅ Retrieved ${posts.data.children.length} posts`);
      if (posts.data.children.length > 0) {
        const firstPost = posts.data.children[0].data;
        console.log(`   ✅ First post: "${firstPost.title.substring(0, 60)}..."`);
        console.log(`   ✅ Score: ${firstPost.score}, Comments: ${firstPost.num_comments}\n`);
      }
    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}\n`);
    }

    // Test 3: Search Reddit
    console.log('4️⃣  Testing: Search Reddit ("TypeScript", limit 3)...');
    try {
      const searchResults = await client.search('TypeScript', undefined, 'relevance', undefined, 3);
      console.log(`   ✅ Found ${searchResults.data.children.length} results`);
      if (searchResults.data.children.length > 0) {
        const firstResult = searchResults.data.children[0].data;
        console.log(`   ✅ First result: "${firstResult.title.substring(0, 60)}..."`);
        console.log(`   ✅ From: r/${firstResult.subreddit}\n`);
      }
    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}\n`);
    }

    // Test 4: Get user info (if username provided)
    if (REDDIT_CONFIG.username) {
      console.log(`5️⃣  Testing: Get user info (u/${REDDIT_CONFIG.username})...`);
      try {
        const userInfo = await client.getUserInfo(REDDIT_CONFIG.username);
        console.log(`   ✅ Username: ${userInfo.name}`);
        console.log(`   ✅ Link Karma: ${userInfo.link_karma.toLocaleString()}`);
        console.log(`   ✅ Comment Karma: ${userInfo.comment_karma.toLocaleString()}`);
        console.log(`   ✅ Total Karma: ${(userInfo.link_karma + userInfo.comment_karma).toLocaleString()}\n`);
      } catch (error: any) {
        console.log(`   ❌ Error: ${error.message}\n`);
      }
    }

    console.log('✅ All tests completed!');
  } catch (error: any) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run tests
testRedditConnection().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});

