# twitter-cli

A command-line interface for the Twitter (X) API v2, built with TypeScript.

## Features

- **Tweet Operations** — Fetch tweets, user timelines
- **User Operations** — Get user info, tweets, and replies
- **Search Operations** — Search tweets with advanced queries (requires Basic tier)
- **Posting Operations** — Post, reply, like, retweet, delete

## Prerequisites

- Node.js v16+
- Twitter API credentials

## Installation

```bash
npm install
npm run build
npm link   # makes `twitter-cli` available globally
```

Or run directly without installing:

```bash
node dist/cli.js --help
```

## Configuration

Set the following environment variables (or put them in a `.env` file):

| Variable | Required | Description |
|---|---|---|
| `TWITTER_API_KEY` | ✅ | API Key (Consumer Key) |
| `TWITTER_API_SECRET` | ✅ | API Secret (Consumer Secret) |
| `TWITTER_BEARER_TOKEN` | Optional | For read operations via OAuth 2.0 |
| `TWITTER_ACCESS_TOKEN` | Optional | For write operations via OAuth 1.0a |
| `TWITTER_ACCESS_SECRET` | Optional | For write operations via OAuth 1.0a |

```bash
export TWITTER_API_KEY="your_api_key"
export TWITTER_API_SECRET="your_api_secret"
export TWITTER_BEARER_TOKEN="your_bearer_token"
export TWITTER_ACCESS_TOKEN="your_access_token"
export TWITTER_ACCESS_SECRET="your_access_secret"
```

## Usage

```
twitter-cli [command] [subcommand] [arguments] [options]
```

### Global options

```
-v, --version    Show version
-h, --help       Show help
```

---

### tweet

```bash
# Get a tweet by ID
twitter-cli tweet get <tweet_id>

# Get a user's timeline
twitter-cli tweet timeline <username> [options]
  -n, --max-results <number>     Number of tweets (1-100, default: 10)
  --since-id <id>                Only tweets after this ID
  --until-id <id>                Only tweets before this ID
  --pagination-token <token>     Token for next page
```

### user

```bash
# Get user profile info
twitter-cli user info <username>

# Get tweets posted by a user
twitter-cli user tweets <username> [options]
  -n, --max-results <number>     Number of tweets (1-100, default: 10)
  --since-id <id>
  --until-id <id>
  --pagination-token <token>

# Get replies made by a user
twitter-cli user replies <username> [options]
  (same options as tweets)
```

### search

> ⚠️ Requires Twitter Basic tier ($100/mo) or higher.

```bash
twitter-cli search tweets "<query>" [options]
  -n, --max-results <number>     Number of results (1-100, default: 10)
  --since-id <id>
  --until-id <id>
  --next-token <token>
  --start-time <time>            YYYY-MM-DDTHH:mm:ssZ
  --end-time <time>              YYYY-MM-DDTHH:mm:ssZ
```

### post

> Requires `TWITTER_ACCESS_TOKEN` and `TWITTER_ACCESS_SECRET`.

```bash
# Post a new tweet
twitter-cli post tweet "Hello Twitter!"

# Reply to a tweet
twitter-cli post reply <tweet_id> "Great post!"

# Like / unlike
twitter-cli post like <tweet_id>
twitter-cli post unlike <tweet_id>

# Retweet / unretweet
twitter-cli post retweet <tweet_id>
twitter-cli post unretweet <tweet_id>

# Delete a tweet (your own only)
twitter-cli post delete <tweet_id>
```

---

## Examples

```bash
# Show @twitter's last 5 tweets
twitter-cli tweet timeline twitter -n 5

# Get info about a user
twitter-cli user info elonmusk

# Search for TypeScript content
twitter-cli search tweets "TypeScript" -n 20

# Post a tweet
twitter-cli post tweet "Hello from twitter-cli!"
```

## Development

```bash
npm run dev      # watch mode
npm run build    # production build
npm test         # run tests
```

## License

MIT
