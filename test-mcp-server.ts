#!/usr/bin/env ts-node

/**
 * Test MCP Server directly
 * Tests the MCP protocol implementation
 */

import { initializeReddit } from './src/reddit';
import { getToolDefinitions, handleToolCall } from './src/tools';

// Initialize Reddit - uses environment variables
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

async function testMCPServer() {
  console.log('🧪 Testing MCP Server Tools...\n');

  try {
    // Initialize Reddit client
    initializeReddit(REDDIT_CONFIG);
    console.log('✅ Reddit client initialized\n');

    // Test 1: List all tools
    console.log('1️⃣  Testing: List all available tools...');
    const tools = getToolDefinitions();
    console.log(`   ✅ Found ${tools.length} tools:`);
    tools.forEach((tool, index) => {
      console.log(`      ${index + 1}. ${tool.name} - ${tool.description.substring(0, 60)}...`);
    });
    console.log();

    // Test 2: Get subreddit info tool
    console.log('2️⃣  Testing: get_subreddit_info tool...');
    const subredditResult = await handleToolCall({
      params: {
        name: 'get_subreddit_info',
        arguments: { subreddit: 'programming' },
      },
    });
    if (subredditResult.isError) {
      const errorText = subredditResult.content[0].type === 'text' ? subredditResult.content[0].text : 'Unknown error';
      console.log(`   ❌ Error: ${errorText}`);
    } else {
      const content = subredditResult.content[0];
      if (content.type === 'text') {
        const data = JSON.parse(content.text);
        console.log(`   ✅ Success! Subreddit: ${data.name}, Subscribers: ${data.subscribers.toLocaleString()}`);
      }
    }
    console.log();

    // Test 3: Get subreddit posts tool
    console.log('3️⃣  Testing: get_subreddit_posts tool...');
    const postsResult = await handleToolCall({
      params: {
        name: 'get_subreddit_posts',
        arguments: { subreddit: 'programming', sort: 'hot', limit: 3 },
      },
    });
    if (postsResult.isError) {
      const errorText = postsResult.content[0].type === 'text' ? postsResult.content[0].text : 'Unknown error';
      console.log(`   ❌ Error: ${errorText}`);
    } else {
      const content = postsResult.content[0];
      if (content.type === 'text') {
        const data = JSON.parse(content.text);
        console.log(`   ✅ Success! Retrieved ${data.posts.length} posts`);
        if (data.posts.length > 0) {
          console.log(`   ✅ First post: "${data.posts[0].title.substring(0, 50)}..."`);
        }
      }
    }
    console.log();

    // Test 4: Search Reddit tool
    console.log('4️⃣  Testing: search_reddit tool...');
    const searchResult = await handleToolCall({
      params: {
        name: 'search_reddit',
        arguments: { query: 'TypeScript', limit: 2 },
      },
    });
    if (searchResult.isError) {
      const errorText = searchResult.content[0].type === 'text' ? searchResult.content[0].text : 'Unknown error';
      console.log(`   ❌ Error: ${errorText}`);
    } else {
      const content = searchResult.content[0];
      if (content.type === 'text') {
        const data = JSON.parse(content.text);
        console.log(`   ✅ Success! Found ${data.posts.length} results`);
        if (data.posts.length > 0) {
          console.log(`   ✅ First result: "${data.posts[0].title.substring(0, 50)}..."`);
        }
      }
    }
    console.log();

    // Test 5: Get user info tool
    console.log('5️⃣  Testing: get_user_info tool...');
    const testUsername = process.env.REDDIT_USERNAME || 'testuser';
    const userResult = await handleToolCall({
      params: {
        name: 'get_user_info',
        arguments: { username: testUsername },
      },
    });
    if (userResult.isError) {
      const errorText = userResult.content[0].type === 'text' ? userResult.content[0].text : 'Unknown error';
      console.log(`   ❌ Error: ${errorText}`);
    } else {
      const content = userResult.content[0];
      if (content.type === 'text') {
        const data = JSON.parse(content.text);
        console.log(`   ✅ Success! Username: ${data.username}, Total Karma: ${data.total_karma.toLocaleString()}`);
      }
    }
    console.log();

    console.log('✅ All MCP tool tests completed successfully!');
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
testMCPServer().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});

