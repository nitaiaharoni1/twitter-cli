# Twitter MCP Server

A Model Context Protocol (MCP) server that provides AI assistants with direct access to Twitter's API v2. This server enables natural language interactions with Twitter data including tweets, users, search, and posting functionality.

## 🚀 Quick Install

### NPX (Recommended - No Installation Required)
```bash
# Run directly with npx (no installation needed)
npx mcp-twitter
```

### Global Installation
```bash
# Install globally for repeated use
npm install -g mcp-twitter
mcp-twitter
```

Restart Claude Desktop after setup.

**✨ New:** Use with NPX - no installation required! Just run `npx mcp-twitter` directly.

## ✨ Features

### 🔍 **Twitter API Integration**
- **Tweet Access** - Get tweets by ID or user timelines
- **User Profiles** - View user information, metrics, and verification status
- **Search** - Search tweets (requires Basic tier or higher)
- **Posting** - Post tweets, reply, like, retweet, and delete

### 🔐 **Dual Authentication**
- **OAuth 2.0 Bearer Token** - For read-only operations (GET endpoints)
- **OAuth 1.0a User Context** - For write operations (POST/DELETE endpoints)
- **Automatic Token Management** - Handles authentication seamlessly

### 📊 **Comprehensive Twitter Tools**
- **Tweet Operations** - Get tweets, user timelines
- **User Operations** - Get user info, tweets, and replies
- **Search Operations** - Search tweets with advanced queries
- **Posting Operations** - Post, reply, like, retweet, delete

### ⚡ **Developer Experience**
- **Easy setup** - Simple environment variable configuration
- **TypeScript** - Full type safety and excellent IDE support
- **Rate Limit Handling** - Automatic rate limit management via twitter-api-v2

## 🛠️ Installation

### Prerequisites
- Node.js (v16 or higher)
- Claude Desktop or any MCP-compatible AI client
- Twitter API credentials (API Key, API Secret, and optionally Access Token/Secret)

### Quick Setup

1. **Get Twitter API Credentials:**
   - Go to https://developer.twitter.com/
   - Create a developer account and project
   - Create an app to get your API credentials
   - Note your API Key, API Secret, and optionally Access Token/Secret

2. **Set Environment Variables:**
   ```bash
   export TWITTER_API_KEY="your_api_key"
   export TWITTER_API_SECRET="your_api_secret"
   export TWITTER_BEARER_TOKEN="your_bearer_token"  # Optional, for read operations
   export TWITTER_ACCESS_TOKEN="your_access_token"   # Optional, for write operations
   export TWITTER_ACCESS_SECRET="your_access_secret" # Optional, for write operations
   ```

   **Minimum Required:**
   - `TWITTER_API_KEY` and `TWITTER_API_SECRET` (required)
   - `TWITTER_BEARER_TOKEN` (optional, for read operations)
   - `TWITTER_ACCESS_TOKEN` and `TWITTER_ACCESS_SECRET` (optional, for write operations like posting, liking, retweeting)

3. **Configure Claude Desktop:**
   Add to your Claude Desktop config file:
   ```json
   {
     "mcpServers": {
       "mcp-twitter": {
         "command": "npx",
         "args": ["mcp-twitter"],
         "env": {
           "TWITTER_API_KEY": "your_api_key",
           "TWITTER_API_SECRET": "your_api_secret",
           "TWITTER_BEARER_TOKEN": "your_bearer_token",
           "TWITTER_ACCESS_TOKEN": "your_access_token",
           "TWITTER_ACCESS_SECRET": "your_access_secret"
         }
       }
     }
   }
   ```

   Config file locations:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   - **Linux**: `~/.config/Claude/claude_desktop_config.json`

4. **Restart Claude Desktop** and you're ready!

## 🎯 Available Tools

The Twitter MCP server provides 13 powerful tools for Twitter interaction:

### Tweet Tools
- **`get_tweet`** - Get detailed information about a specific tweet by ID
- **`get_user_timeline`** - Get tweets from a user's timeline with pagination

### User Tools
- **`get_user_info`** - Get user profile information, metrics, and verification status
- **`get_user_tweets`** - Get tweets posted by a user
- **`get_user_replies`** - Get replies made by a user

### Search Tools
- **`search_tweets`** - Search tweets with advanced query operators (⚠️ requires Basic tier $100/mo or higher)

### Posting Tools (Requires OAuth 1.0a Authentication)
- **`post_tweet`** - Post a new tweet (up to 280 characters, or 4000 for premium)
- **`reply_to_tweet`** - Reply to an existing tweet
- **`like_tweet`** - Like a tweet
- **`unlike_tweet`** - Remove a like from a tweet
- **`retweet`** - Retweet a tweet
- **`unretweet`** - Remove a retweet
- **`delete_tweet`** - Delete a tweet (your own tweets only)

## 💡 Usage Examples

### Basic Twitter Exploration
```
"What are the latest tweets from @twitter?"
"Get information about user @elonmusk"
"Show me tweets from @github"
```

### Tweet Analysis
```
"Get details about tweet [tweet_id]"
"Show me the timeline for @twitter"
"What are the replies from @username?"
```

### User Research
```
"Get information about user @username"
"Show me tweets by @username"
"What replies has @username made recently?"
```

### Search Functionality (Requires Basic Tier)
```
"Search Twitter for 'TypeScript tutorials'"
"Find tweets about 'machine learning' from this week"
"Search for tweets with 'has:media' from @username"
```

### Posting and Interaction (Requires OAuth 1.0a)
```
"Post a tweet: 'Hello Twitter! This is my first tweet via MCP'"
"Reply to tweet [tweet_id] with 'Great post! Thanks for sharing.'"
"Like tweet [tweet_id]"
"Retweet tweet [tweet_id]"
"Delete my tweet [tweet_id]"
```

## 🔧 Configuration

### Environment Variables

**Required:**
- **`TWITTER_API_KEY`** - Your Twitter app API Key (Consumer Key)
- **`TWITTER_API_SECRET`** - Your Twitter app API Secret (Consumer Secret)

**Optional (for read operations):**
- **`TWITTER_BEARER_TOKEN`** - Bearer token for OAuth 2.0 read operations

**Optional (for write operations):**
- **`TWITTER_ACCESS_TOKEN`** - Access token for OAuth 1.0a write operations
- **`TWITTER_ACCESS_SECRET`** - Access token secret for OAuth 1.0a write operations

### Authentication Modes

1. **Read-Only Mode**: Requires `TWITTER_API_KEY`, `TWITTER_API_SECRET`, and optionally `TWITTER_BEARER_TOKEN`
   - Can: Get tweets, user info, timelines, search (if tier allows)
   - Cannot: Post, like, retweet, delete

2. **Full Access Mode**: Requires all credentials including `TWITTER_ACCESS_TOKEN` and `TWITTER_ACCESS_SECRET`
   - Can: All read operations + post, reply, like, retweet, delete

## 📋 Rate Limits & API Tiers

### Free Tier Limitations
- ✅ Read tweets, user profiles, timelines
- ✅ Post tweets (1,500/month limit)
- ✅ Like, retweet, reply, delete
- ❌ Search API (requires Basic tier $100/mo minimum)
- ❌ Advanced filtering options

### Basic Tier ($100/month)
- ✅ All Free tier features
- ✅ Search API access
- ✅ Higher rate limits
- ✅ Advanced query operators

**Note:** The search tool will return a helpful error message if you're on the free tier and try to use it.

## 🧪 Testing

### Running Tests

```bash
# Run tests (when implemented)
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 🏗️ Development

### Local Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/nitaiaharoni1/twitter-mcp.git
   cd twitter-mcp
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your Twitter credentials
   ```

4. **Build the project:**
   ```bash
   npm run build
   ```

5. **Run in development mode:**
   ```bash
   npm run dev
   ```

### Development Scripts

- `npm run build` - Build the project
- `npm run dev` - Run in development mode
- `npm run start` - Run production build
- `npm run clean` - Clean build artifacts

## 📦 Publishing

### Prerequisites

1. **NPM Account**: Make sure you have an NPM account and are logged in
   ```bash
   npm login
   ```

2. **Version Update**: Update the version in `package.json` if needed
   ```bash
   npm version patch  # or minor/major
   ```

### Publishing Steps

1. **Pre-publish Check:**
   ```bash
   npm run publish:check
   ```
   This will clean, build, and show what files will be included.

2. **Publish to NPM:**
   ```bash
   npm run publish:public
   ```

3. **Verify Publication:**
   ```bash
   npx mcp-twitter --version
   ```

### Benefits of NPX Approach

- ✅ **No installation required** - Users can run immediately
- ✅ **Always latest version** - NPX fetches the newest version
- ✅ **No global pollution** - Doesn't install packages globally
- ✅ **Cross-platform** - Works on Windows, macOS, Linux
- ✅ **Easy updates** - Users automatically get updates

## 🔒 Security

### ⚠️ Important: Never Commit Credentials

**Never commit your Twitter API credentials to git!**

### Best Practices

✅ **DO:**
- Use environment variables for all secrets
- Add `.env` files to `.gitignore`
- Use `.env.example` with placeholder values
- Never commit actual credentials
- Test files are in `.gitignore` - they won't be committed

❌ **DON'T:**
- Hardcode secrets in source files
- Commit test files with real credentials
- Share credentials in documentation
- Store secrets in version control

### Environment Variables

Always set credentials via environment variables:

```bash
export TWITTER_API_KEY="your_api_key"
export TWITTER_API_SECRET="your_api_secret"
export TWITTER_BEARER_TOKEN="your_bearer_token"
export TWITTER_ACCESS_TOKEN="your_access_token"
export TWITTER_ACCESS_SECRET="your_access_secret"
```

### Credential Rotation

If you've accidentally committed credentials:
1. Go to https://developer.twitter.com/
2. Regenerate your API keys and tokens
3. Update your environment variables
4. Revoke old tokens if possible

## 📄 License

**MIT License** - See the [LICENSE](LICENSE) file for complete terms and conditions.

## 🙋‍♂️ Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/nitaiaharoni1/twitter-mcp/issues)
- **Documentation**: This README and inline code documentation
- **Community**: Contributions and discussions welcome!

## ⚠️ Important Notes

- **Twitter API Terms**: Please review Twitter's [API Terms](https://developer.twitter.com/en/docs/twitter-api) and [Developer Terms](https://developer.twitter.com/en/developer-terms/agreement-and-policy)
- **Rate Limits**: Be mindful of Twitter's rate limits based on your tier
- **API Tiers**: Free tier has limitations (no search API). Basic tier ($100/mo) required for search functionality
- **OAuth Required**: Twitter requires OAuth authentication for API access
- **Tweet Length**: Default 280 characters, or 4000 for premium accounts

---

**Made with ❤️ for the AI and Twitter community**
