#!/usr/bin/env node

const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

async function build() {
  try {
    console.log('🔨 Building with esbuild...');
    
    // Clean dist directory
    if (fs.existsSync('dist')) {
      fs.rmSync('dist', { recursive: true, force: true });
    }
    fs.mkdirSync('dist', { recursive: true });

    // Read package.json for version injection
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

    const baseConfig = {
      entryPoints: ['server.ts'],
      bundle: true,
      platform: 'node',
      target: 'node16',
      format: 'cjs',
      external: [
        // Keep external dependencies as external
        '@modelcontextprotocol/sdk',
        'axios',
        'dotenv'
      ],
      define: {
        'process.env.NODE_ENV': '"production"',
        '__PACKAGE_VERSION__': `"${packageJson.version}"`
      },
      treeShaking: true,
      loader: {
        '.json': 'json'
      },
      resolveExtensions: ['.ts', '.js', '.json'],
      mainFields: ['main', 'module'],
      conditions: ['node']
    };

    // Build minified version (production)
    await esbuild.build({
      ...baseConfig,
      outfile: 'dist/server.js',
      minify: true,
      sourcemap: false,
      keepNames: false,
      legalComments: 'none',
      logLevel: 'info'
    });

    // Build non-minified version for comparison (if --compare flag is passed)
    if (process.argv.includes('--compare')) {
      await esbuild.build({
        ...baseConfig,
        outfile: 'dist/server.dev.js',
        minify: false,
        sourcemap: true,
        keepNames: true,
        legalComments: 'inline',
        logLevel: 'info'
      });
    }

    // Make the output executable
    fs.chmodSync('dist/server.js', '755');
    if (fs.existsSync('dist/server.dev.js')) {
      fs.chmodSync('dist/server.dev.js', '755');
    }

    // Copy package.json for dependencies info and runtime access
    const distPackageJson = {
      name: packageJson.name,
      version: packageJson.version,
      description: packageJson.description,
      main: 'server.js',
      bin: {
        'mcp-twitter': 'server.js'
      },
      dependencies: packageJson.dependencies,
      engines: packageJson.engines
    };
    
    fs.writeFileSync('dist/package.json', JSON.stringify(distPackageJson, null, 2));

    // Copy other necessary files
    if (fs.existsSync('.env.example')) {
      fs.copyFileSync('.env.example', 'dist/.env.example');
    }
    if (fs.existsSync('README.md')) {
      fs.copyFileSync('README.md', 'dist/README.md');
    }
    if (fs.existsSync('LICENSE')) {
      fs.copyFileSync('LICENSE', 'dist/LICENSE');
    }

    console.log('✅ Build completed successfully!');
    console.log('📦 Output: dist/server.js');
    
    // Show file size comparison
    const prodStats = fs.statSync('dist/server.js');
    console.log(`📊 Minified bundle size: ${(prodStats.size / 1024).toFixed(2)} KB`);
    
    if (fs.existsSync('dist/server.dev.js')) {
      const devStats = fs.statSync('dist/server.dev.js');
      const savings = ((devStats.size - prodStats.size) / devStats.size * 100).toFixed(1);
      console.log(`📊 Development bundle size: ${(devStats.size / 1024).toFixed(2)} KB`);
      console.log(`💾 Size reduction: ${savings}% (${((devStats.size - prodStats.size) / 1024).toFixed(2)} KB saved)`);
    }
    
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

build(); 