#!/usr/bin/env node

/**
 * Release Management Script
 * Handles version bumping and automated releases
 */

import * as fsModule from 'fs';
import * as pathModule from 'path';
import { execSync } from 'child_process';

// Type definitions
interface Colors {
  [key: string]: string;
  reset: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
}

interface ReleaseOptions {
  version?: string;
  dryRun?: boolean;
  yes?: boolean;
}

// Console colors
const colors: Colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorize(message: string, color: keyof Colors): string {
  return `${colors[color]}${message}${colors.reset}`;
}

function runCommand(command: string, description: string): string {
  try {
    console.log(colorize(`► ${description}`, 'cyan'));
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    console.log(colorize(`✓ ${description} completed`, 'green'));
    return output.trim();
  } catch (error) {
    console.error(colorize(`✗ ${description} failed: ${(error as Error).message}`, 'red'));
    throw error;
  }
}

function updatePackageVersion(newVersion: string): void {
  const packagePath = pathModule.join(process.cwd(), 'package.json');
  const packageContent = fsModule.readFileSync(packagePath, 'utf8');
  const packageData = JSON.parse(packageContent);
  packageData.version = newVersion;
  fsModule.writeFileSync(packagePath, JSON.stringify(packageData, null, 2) + '\n');
}

function getCurrentVersion(): string {
  const packagePath = pathModule.join(process.cwd(), 'package.json');
  const packageContent = fsModule.readFileSync(packagePath, 'utf8');
  const packageData = JSON.parse(packageContent);
  return packageData.version;
}

function incrementVersion(version: string, type: 'major' | 'minor' | 'patch'): string {
  const parts = version.split('.').map(Number);
  
  switch (type) {
    case 'major':
      return `${parts[0] + 1}.0.0`;
    case 'minor':
      return `${parts[0]}.${parts[1] + 1}.0`;
    case 'patch':
      return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
    default:
      throw new Error(`Unknown version type: ${type}`);
  }
}

function validateWorkingDirectory(): void {
  try {
    const status = runCommand('git status --porcelain', 'Checking working directory');
    if (status) {
      throw new Error('Working directory is not clean. Please commit or stash changes.');
    }
  } catch (error) {
    console.error(colorize(`✗ Git validation failed: ${(error as Error).message}`, 'red'));
    throw error;
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options: ReleaseOptions = {};
  
  // Parse arguments
  let versionType: 'major' | 'minor' | 'patch' = 'patch';
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--yes':
        options.yes = true;
        break;
      case 'major':
      case 'minor':
      case 'patch':
        versionType = arg;
        break;
      default:
        if (arg.match(/^\d+\.\d+\.\d+$/)) {
          options.version = arg;
        }
    }
  }

  try {
    console.log(colorize('🚀 Starting release process...', 'blue'));
    
    // Validate environment
    validateWorkingDirectory();
    
    // Determine new version
    const currentVersion = getCurrentVersion();
    const newVersion = options.version || incrementVersion(currentVersion, versionType);
    
    console.log(colorize(`📦 Current version: ${currentVersion}`, 'yellow'));
    console.log(colorize(`📦 New version: ${newVersion}`, 'green'));
    
    if (options.dryRun) {
      console.log(colorize('🔍 Dry run mode - no changes will be made', 'yellow'));
      return;
    }
    
    // Update version
    updatePackageVersion(newVersion);
    runCommand('npm run build', 'Building project');
    runCommand('npm run test:unit', 'Running unit tests');
    
    // Git operations
    runCommand(`git add package.json`, 'Staging version change');
    runCommand(`git commit -m "chore: bump version to ${newVersion}"`, 'Committing version change');
    runCommand(`git tag v${newVersion}`, 'Creating git tag');
    
    console.log(colorize(`✅ Release ${newVersion} completed successfully!`, 'green'));
    console.log(colorize('📝 Don\'t forget to push with: git push && git push --tags', 'cyan'));
    
  } catch (error) {
    console.error(colorize(`❌ Release failed: ${(error as Error).message}`, 'red'));
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error(colorize(`❌ Fatal error: ${error.message}`, 'red'));
    process.exit(1);
  });
} 