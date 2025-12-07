/**
 * Command-line interface for Reddit MCP
 */

// Type declaration for build-time injected constants
declare const __PACKAGE_VERSION__: string;

/**
 * CLI Command Handler
 */
export function handleCliCommands(args: string[]): boolean {
  // Show version if requested
  if (args.length > 0 && (args[0] === '--version' || args[0] === '-v')) {
    const version =
      typeof __PACKAGE_VERSION__ !== 'undefined'
        ? __PACKAGE_VERSION__
        : '1.0.0';
    console.log(`reddit-mcp v${version}`);
    return true;
  }

  // Show help if requested
  if (args.length > 0 && (args[0] === '--help' || args[0] === '-h')) {
    console.log(`
Reddit MCP Server

Usage: reddit-mcp [options]

Options:
  --version, -v    Show version number
  --help, -h       Show help message

Environment Variables:
  REDDIT_CLIENT_ID        Your Reddit app Client ID (required)
  REDDIT_CLIENT_SECRET    Your Reddit app Client Secret (required)
  REDDIT_USER_AGENT       User-Agent string (required)
  REDDIT_USERNAME         Your Reddit username (optional)
  REDDIT_PASSWORD         Your Reddit password (optional)

For more information, visit: https://github.com/nitaiaharoni1/reddit-mcp
    `);
    return true;
  }

  // No CLI commands needed - server runs on stdio
  return false;
}
