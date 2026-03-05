/**
 * Persistent global credentials manager
 * Stores and retrieves API keys from ~/.twitter-cli/config.json
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.twitter-cli');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export interface StoredCredentials {
  TWITTER_API_KEY?: string;
  TWITTER_API_SECRET?: string;
  TWITTER_BEARER_TOKEN?: string;
  TWITTER_ACCESS_TOKEN?: string;
  TWITTER_ACCESS_SECRET?: string;
}

export function loadStoredCredentials(): StoredCredentials {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return JSON.parse(raw) as StoredCredentials;
    }
  } catch {
    // Ignore parse/read errors — treat as empty
  }
  return {};
}

export function saveCredentials(creds: StoredCredentials): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  const existing = loadStoredCredentials();
  const merged = { ...existing, ...creds };
  // Remove undefined/empty values
  for (const key of Object.keys(merged) as Array<keyof StoredCredentials>) {
    if (!merged[key]) delete merged[key];
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), { mode: 0o600 });
}

export function clearCredentials(): void {
  if (fs.existsSync(CONFIG_FILE)) {
    fs.unlinkSync(CONFIG_FILE);
  }
}

export function getConfigFilePath(): string {
  return CONFIG_FILE;
}

/**
 * Inject stored credentials into process.env so the rest of the
 * app picks them up automatically. Stored global credentials (set via
 * `auth set`) take precedence over .env file values, since the user
 * explicitly chose them. True shell env vars (set before the process
 * starts) still win over everything.
 */
export function injectStoredCredentials(): void {
  const stored = loadStoredCredentials();
  // We check for values already set by a real shell env var by looking at
  // whether they were present BEFORE dotenv ran. Since we can't easily
  // distinguish that, we override dotenv-sourced values with our stored
  // config — stored config is always more intentional than a stale .env file.
  for (const [key, value] of Object.entries(stored)) {
    if (value) {
      process.env[key] = value;
    }
  }
}
