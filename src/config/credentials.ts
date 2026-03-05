/**
 * Persistent global credentials manager with multi-profile support.
 * Stores profiles in ~/.twitter-cli/config.json
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

export interface ConfigFile {
  profiles?: Record<string, StoredCredentials>;
  default?: string;
  // Legacy: flat credentials (migrated to "default" profile)
  TWITTER_API_KEY?: string;
  TWITTER_API_SECRET?: string;
  TWITTER_BEARER_TOKEN?: string;
  TWITTER_ACCESS_TOKEN?: string;
  TWITTER_ACCESS_SECRET?: string;
}

function loadRawConfig(): ConfigFile {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return JSON.parse(raw) as ConfigFile;
    }
  } catch {
    // Ignore parse/read errors — treat as empty
  }
  return {};
}

/**
 * Migrate legacy flat config to profiles format.
 * Returns true if migration was performed and config was rewritten.
 */
function migrateIfLegacy(config: ConfigFile): boolean {
  const hasLegacy =
    config.TWITTER_API_KEY !== undefined ||
    config.TWITTER_API_SECRET !== undefined ||
    config.TWITTER_BEARER_TOKEN !== undefined ||
    config.TWITTER_ACCESS_TOKEN !== undefined ||
    config.TWITTER_ACCESS_SECRET !== undefined;

  if (!hasLegacy) return false;

  const legacyCreds: StoredCredentials = {
    TWITTER_API_KEY: config.TWITTER_API_KEY,
    TWITTER_API_SECRET: config.TWITTER_API_SECRET,
    TWITTER_BEARER_TOKEN: config.TWITTER_BEARER_TOKEN,
    TWITTER_ACCESS_TOKEN: config.TWITTER_ACCESS_TOKEN,
    TWITTER_ACCESS_SECRET: config.TWITTER_ACCESS_SECRET,
  };

  const migrated: ConfigFile = {
    profiles: {
      ...(config.profiles || {}),
      default: { ...(config.profiles?.default || {}), ...legacyCreds },
    },
    default: config.default || 'default',
  };

  // Remove legacy keys from migrated object
  delete (migrated as any).TWITTER_API_KEY;
  delete (migrated as any).TWITTER_API_SECRET;
  delete (migrated as any).TWITTER_BEARER_TOKEN;
  delete (migrated as any).TWITTER_ACCESS_TOKEN;
  delete (migrated as any).TWITTER_ACCESS_SECRET;

  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(migrated, null, 2), { mode: 0o600 });
  return true;
}

function loadConfig(): ConfigFile {
  let config = loadRawConfig();
  if (migrateIfLegacy(config)) {
    config = loadRawConfig();
  }
  return config;
}

export function loadStoredCredentials(profileName?: string): StoredCredentials {
  const config = loadConfig();

  const profile = profileName || config.default;
  if (profile && config.profiles?.[profile]) {
    return config.profiles[profile];
  }
  // Fallback: first profile if default not set
  if (config.profiles && Object.keys(config.profiles).length > 0) {
    const first = Object.keys(config.profiles)[0];
    return config.profiles[first];
  }
  return {};
}

export function listProfiles(): { name: string; isDefault: boolean }[] {
  const config = loadConfig();

  const defaultName = config.default;
  const names = Object.keys(config.profiles || {});

  return names.map((name) => ({
    name,
    isDefault: name === defaultName,
  }));
}

export function getDefaultProfile(): string | undefined {
  const config = loadConfig();
  return config.default;
}

export function setDefaultProfile(profileName: string): void {
  const config = loadConfig();

  if (!config.profiles?.[profileName]) {
    throw new Error(`Profile "${profileName}" does not exist. Use \`auth set --profile ${profileName}\` first.`);
  }

  config.default = profileName;
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), { mode: 0o600 });
}

export function saveCredentials(creds: StoredCredentials, profileName: string = 'default'): void {
  const config = loadConfig();

  if (!config.profiles) config.profiles = {};
  const existing = config.profiles[profileName] || {};
  const merged = { ...existing, ...creds };
  for (const key of Object.keys(merged) as Array<keyof StoredCredentials>) {
    if (!merged[key]) delete merged[key];
  }
  config.profiles[profileName] = merged;

  if (!config.default) config.default = profileName;

  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), { mode: 0o600 });
}

export function deleteProfile(profileName: string): void {
  const config = loadConfig();

  if (!config.profiles?.[profileName]) {
    throw new Error(`Profile "${profileName}" does not exist.`);
  }

  delete config.profiles[profileName];
  if (config.default === profileName) {
    config.default = Object.keys(config.profiles)[0];
  }
  if (Object.keys(config.profiles).length === 0) {
    fs.unlinkSync(CONFIG_FILE);
    return;
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), { mode: 0o600 });
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
 * Resolve which profile to use.
 * Priority: TWITTER_PROFILE env → explicit profile arg → config default.
 */
export function resolveProfile(profileFromArg?: string): string | undefined {
  if (profileFromArg) return profileFromArg;
  if (process.env.TWITTER_PROFILE) return process.env.TWITTER_PROFILE;
  return getDefaultProfile();
}

/**
 * Inject stored credentials for the given profile into process.env.
 */
export function injectStoredCredentials(profileName?: string): void {
  const profile = resolveProfile(profileName);
  const stored = loadStoredCredentials(profile);
  for (const [key, value] of Object.entries(stored)) {
    if (value) {
      process.env[key] = value;
    }
  }
}
