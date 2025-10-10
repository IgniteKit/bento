#!/usr/bin/env node

/**
 * Bento - WordPress Plugin Bundler CLI
 * Command-line interface for the Bento bundler
 */

const { Command } = require('commander');
const path = require('path');
const fs = require('fs');
const WordPressBundler = require('../lib/bundler');

const program = new Command();

program
  .name('bento')
  .description('Bento - A custom bundler specifically designed for WordPress plugins')
  .version('1.0.0');

program
  .command('build')
  .description('Build assets for production and development')
  .option('-c, --config <path>', 'path to config file', 'bento.conf.js')
  .option('-w, --watch', 'watch for changes and rebuild')
  .option('--no-clean', 'skip cleaning output directory')
  .action(async (options) => {
    try {
      const config = loadConfig(options.config);

      if (options.noClean) {
        config.clean = false;
      }

      const bundler = new WordPressBundler(config);

      console.log('🍱 Bento bundler starting...');
      await bundler.build();

      if (options.watch) {
        bundler.watch();
      }
    } catch (error) {
      console.error('❌ Build failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('watch')
  .description('Watch for changes and rebuild automatically')
  .option('-c, --config <path>', 'path to config file', 'bento.conf.js')
  .action(async (options) => {
    try {
      const config = loadConfig(options.config);
      const bundler = new WordPressBundler(config);

      console.log('🍱 Bento bundler starting...');
      await bundler.build();
      bundler.watch();
    } catch (error) {
      console.error('❌ Watch failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialize bento.conf.js in current directory')
  .action(() => {
    const configPath = path.join(process.cwd(), 'bento.conf.js');

    if (fs.existsSync(configPath)) {
      console.log('⚠️  bento.conf.js already exists');
      return;
    }

    const defaultConfig = `/**
 * Bento - WordPress Plugin Bundler Configuration
 * 
 * This file configures Bento for your WordPress plugin
 */

module.exports = {
    // Entry points - directories containing your source files
    entry: {
        admin: 'scripts/admin',
        frontend: 'scripts/frontend',
        shared: 'scripts/shared'
    },

    // Output directory where built files will be placed
    output: 'public',

    // Build options
    clean: true,               // Clean output directory before build
    
    // WordPress specific options
    wordpress: {
        // Plugin text domain (for translations)
        textDomain: 'your-plugin-textdomain',
        
        // Generate WordPress-style handles for enqueuing
        generateHandles: true,
        
        // WordPress coding standards compliance
        wpCodingStandards: true
    },

    // Advanced options
    advanced: {
        // Automatically detect and install npm dependencies
        autoInstallDeps: true,
        
        // Transpile modern JS to older browsers
        transpile: {
            target: 'es5',
            browsers: ['> 1%', 'last 2 versions', 'ie >= 11']
        },
        
        // CSS preprocessing options
        css: {
            autoprefixer: true,
            purgeUnused: false  // Remove unused CSS (be careful with WordPress)
        },
        
        // Bundle optimization
        optimization: {
            splitChunks: true,     // Create separate chunks for shared code
            treeshake: true,       // Remove unused code
            compress: true         // Additional compression
        }
    }
};`;

    fs.writeFileSync(configPath, defaultConfig);
    console.log('✅ Created bento.conf.js');
    console.log('📝 Edit the config file to customize your build settings');
  });

/**
 * Load configuration file
 */
function loadConfig(configPath) {
  const fullPath = path.resolve(process.cwd(), configPath);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Config file not found: ${configPath}`);
    console.log('💡 Run "bento init" to create a default config file');
    return {};
  }

  try {
    delete require.cache[require.resolve(fullPath)];
    return require(fullPath);
  } catch (error) {
    console.error(`❌ Error loading config file: ${error.message}`);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

program.parse();
