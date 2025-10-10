# Bento

🍱 A custom bundler specifically designed for WordPress plugins - like Vite but for WordPress.

## Features

- 🚀 **WordPress-focused**: Built specifically for WordPress plugin development
- 📦 **Dual output**: Creates both minified and unminified versions of all assets
- 🎯 **Zero config**: Works out of the box with sensible defaults
- 🔄 **Watch mode**: Automatic rebuilding on file changes
- 🎨 **SCSS/Sass support**: Built-in CSS preprocessing
- ⚡ **ES6+ transpilation**: Modern JavaScript support with Babel
- 📋 **Smart manifest**: Asset tracking for WordPress integration
- 🧹 **Clean builds**: Automatic output directory cleaning

## Installation

```bash
npm install @ignitekit/bento --save-dev
```

## Quick Start

1. **Initialize configuration:**
   ```bash
   npx bento init
   ```

2. **Build your assets:**
   ```bash
   npx bento build
   ```

3. **Watch for changes:**
   ```bash
   npx bento watch
   ```

## Project Structure

Bento expects your WordPress plugin to follow this structure:

```
your-plugin/
├── scripts/
│   ├── admin/          # Admin-specific JS/CSS
│   ├── frontend/       # Frontend JS/CSS  
│   └── shared/         # Shared utilities
├── public/             # Generated assets (output)
├── bento.conf.js
└── package.json
```

## Configuration

Create a `bento.conf.js` file in your plugin root:

```javascript
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
        textDomain: 'your-plugin-textdomain',
        generateHandles: true,
        wpCodingStandards: true
    },

    // Advanced options
    advanced: {
        autoInstallDeps: true,
        transpile: {
            target: 'es5',
            browsers: ['> 1%', 'last 2 versions', 'ie >= 11']
        },
        css: {
            autoprefixer: true,
            purgeUnused: false
        },
        optimization: {
            splitChunks: true,
            treeshake: true,
            compress: true
        }
    }
};
```

## CLI Commands

### Build
Build assets for production and development:
```bash
npx bento build
```

Options:
- `-c, --config <path>` - Custom config file path
- `-w, --watch` - Watch for changes
- `--no-clean` - Skip cleaning output directory

### Watch
Watch for changes and rebuild automatically:
```bash
npx bento watch
```

### Initialize
Create a default configuration file:
```bash
npx bento init
```

## Output

Bento creates both versions of every asset:

- **Development files** (`.js`, `.css`) - Unminified, readable
- **Production files** (`.min.js`, `.min.css`) - Minified, optimized

### Example Output:
```
public/
├── admin/
│   ├── main.js          # Unminified
│   ├── main.min.js      # Minified
│   ├── main.css         # Unminified
│   └── main.min.css     # Minified
├── frontend/
│   └── ...
├── shared/
│   └── ...
└── manifest.json        # Asset mapping
```

## WordPress Integration

Bento generates a `manifest.json` file that maps source files to their built versions:

```json
{
  "main.js": {
    "unminified": "main.js",
    "minified": "main.min.js"
  },
  "main.scss": {
    "unminified": "main.css",
    "minified": "main.min.css"
  }
}
```

Use this manifest in your WordPress plugin to conditionally load minified or unminified assets based on `WP_DEBUG` or other conditions.

## Package.json Scripts

Add these scripts to your plugin's `package.json`:

```json
{
  "scripts": {
    "build": "bento build",
    "watch": "bento watch",
    "dev": "bento watch"
  }
}
```

## Dependencies

### Required:
- Node.js >= 14.0.0
- chokidar (for watch mode)

### Optional (peer dependencies):
- `sass` - For SCSS/Sass processing
- `@babel/core` + `@babel/preset-env` - For ES6+ transpilation

Install optional dependencies if needed:
```bash
npm install sass @babel/core @babel/preset-env --save-dev
```

## Comparison with Vite

| Feature | Bento | Vite |
|---------|-------|------|
| WordPress-focused | ✅ | ❌ |
| Dual output (min/unmin) | ✅ | ❌ |
| Zero config for WP | ✅ | ❌ |
| Dev server | ❌ | ✅ |
| HMR | ❌ | ✅ |
| File size | Lightweight | Heavier |

## Why "Bento"?

Just like a bento box neatly organizes different foods in compartments, Bento bundler neatly organizes your WordPress plugin assets into admin, frontend, and shared compartments! 🍱

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see LICENSE file for details.

## Support

- 🐛 [Report bugs](https://github.com/ignitekit/bento/issues)
- 💡 [Request features](https://github.com/ignitekit/bento/issues)
- 📚 [Documentation](https://github.com/ignitekit/bento#readme)
