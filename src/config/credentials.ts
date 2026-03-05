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
 * app picks them up automatically. env vars set at runtime take
 * precedence over stored values.
 */
export function injectStoredCredentials(): void {
  const stored = loadStoredCredentials();
  for (const [key, value] of Object.entries(stored)) {
    if (value && !process.env[key]) {
      process.env[key] = value;
    }
  }
}
