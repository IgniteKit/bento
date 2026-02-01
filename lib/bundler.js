/**
 * Bento - WordPress Plugin Bundler
 * A custom bundler specifically designed for WordPress plugins
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class WordPressBundler {
    constructor(config = {}) {
        this.config = {
            // Default configuration
            entry: {
                admin: 'scripts/admin',
                frontend: 'scripts/frontend',
                shared: 'scripts/shared'
            },
            output: 'public',
            clean: true,
            wordpress: {
                textDomain: 'default',
                generateHandles: true,
                wpCodingStandards: true
            },
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
            },
            ...config
        };

        this.dependencies = new Set();
        this.processedFiles = new Map();
        this.manifest = {};
    }

    /**
     * Main build function
     */
    async build() {
        console.log('🍱 Bento bundler starting...');

        if (this.config.clean) {
            this.cleanOutput();
        }

        // Ensure output directories exist
        this.ensureDirectories();

        // Process each entry point
        for (const [name, entryPath] of Object.entries(this.config.entry)) {
            await this.processEntry(name, entryPath);
        }

        // Generate manifest
        this.generateManifest();

        // Install any discovered dependencies
        if (this.config.advanced.autoInstallDeps) {
            await this.installDependencies();
        }

        console.log('✅ Build completed successfully!');
    }

    /**
     * Clean output directory
     */
    cleanOutput() {
        const outputPath = this.config.output;
        if (fs.existsSync(outputPath)) {
            fs.rmSync(outputPath, { recursive: true, force: true });
        }
    }

    /**
     * Ensure output directories exist
     */
    ensureDirectories() {
        const dirs = ['admin', 'frontend', 'shared', 'assets'];
        dirs.forEach(dir => {
            const dirPath = path.join(this.config.output, dir);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }
        });
    }

    /**
     * Process entry point directory
     */
    async processEntry(name, entryPath) {
        console.log(`📂 Processing ${name} entry: ${entryPath}`);

        if (!fs.existsSync(entryPath)) {
            console.warn(`⚠️  Entry path ${entryPath} does not exist`);
            return;
        }

        const files = this.getFilesRecursively(entryPath);

        for (const file of files) {
            await this.processFile(file, name);
        }
    }

    /**
     * Get all files recursively from directory
     */
    getFilesRecursively(dir) {
        const files = [];
        const items = fs.readdirSync(dir);

        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                files.push(...this.getFilesRecursively(fullPath));
            } else if (this.isProcessableFile(fullPath)) {
                files.push(fullPath);
            }
        }

        return files;
    }

    /**
     * Check if file should be processed
     */
    isProcessableFile(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        return ['.js', '.css', '.scss', '.sass'].includes(ext);
    }

    /**
     * Process individual file
     */
    async processFile(filePath, entryName) {
        const ext = path.extname(filePath).toLowerCase();
        const relativePath = path.relative(this.config.entry[entryName], filePath);
        const outputDir = path.join(this.config.output, entryName);

        console.log(`  📄 Processing: ${relativePath}`);

        switch (ext) {
            case '.js':
                await this.processJavaScript(filePath, outputDir, relativePath);
                break;
            case '.scss':
            case '.sass':
                await this.processSass(filePath, outputDir, relativePath);
                break;
            case '.css':
                await this.processCSS(filePath, outputDir, relativePath);
                break;
        }
    }

    /**
     * Process JavaScript files
     */
    async processJavaScript(inputPath, outputDir, relativePath) {
        const content = fs.readFileSync(inputPath, 'utf8');

        // Extract dependencies from imports
        this.extractDependencies(content);

        // Ensure output directory exists
        const outputFileDir = path.join(outputDir, path.dirname(relativePath));
        fs.mkdirSync(outputFileDir, { recursive: true });

        let processedContent = content;

        // Transpile ES6+ if needed
        if (this.needsTranspilation(content)) {
            processedContent = await this.transpileJS(content);
        }

        // Create both versions
        const baseName = relativePath.replace(/\.js$/, '');

        // Unminified version
        const unminifiedFileName = `${baseName}.js`;
        const unminifiedPath = path.join(outputDir, unminifiedFileName);
        fs.writeFileSync(unminifiedPath, processedContent);

        // Minified version
        const minifiedContent = await this.minifyJS(processedContent);
        const minifiedFileName = `${baseName}.min.js`;
        const minifiedPath = path.join(outputDir, minifiedFileName);
        fs.writeFileSync(minifiedPath, minifiedContent);

        // Update manifest with both versions
        this.manifest[relativePath] = {
            unminified: unminifiedFileName,
            minified: minifiedFileName
        };
    }

    /**
     * Process SCSS/Sass files
     */
    async processSass(inputPath, outputDir, relativePath) {
        try {
            // Check if sass is available
            if (!this.isSassAvailable()) {
                console.warn('⚠️  Sass not found. Install sass: npm install sass');
                return;
            }

            // Compile SCSS to CSS
            const runner = this.getPackageRunner();
            const result = execSync(`${runner} sass "${inputPath}" --style=expanded --no-source-map`, {
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'pipe']
            });

            // Ensure output directory exists
            const outputFileDir = path.join(outputDir, path.dirname(relativePath));
            fs.mkdirSync(outputFileDir, { recursive: true });

            // Create both versions
            const baseName = relativePath.replace(/\.(scss|sass)$/, '');

            // Unminified version
            const unminifiedFileName = `${baseName}.css`;
            const unminifiedPath = path.join(outputDir, unminifiedFileName);
            fs.writeFileSync(unminifiedPath, result);

            // Minified version
            const minifiedContent = this.minifyCSS(result);
            const minifiedFileName = `${baseName}.min.css`;
            const minifiedPath = path.join(outputDir, minifiedFileName);
            fs.writeFileSync(minifiedPath, minifiedContent);

            // Update manifest with both versions
            this.manifest[relativePath] = {
                unminified: unminifiedFileName,
                minified: minifiedFileName
            };

        } catch (error) {
            console.error(`❌ Error processing SCSS file ${inputPath}:`, error.message);
        }
    }

    /**
     * Process CSS files
     */
    async processCSS(inputPath, outputDir, relativePath) {
        const content = fs.readFileSync(inputPath, 'utf8');

        // Ensure output directory exists
        const outputFileDir = path.join(outputDir, path.dirname(relativePath));
        fs.mkdirSync(outputFileDir, { recursive: true });

        // Create both versions
        const baseName = relativePath.replace(/\.css$/, '');

        // Unminified version
        const unminifiedFileName = `${baseName}.css`;
        const unminifiedPath = path.join(outputDir, unminifiedFileName);
        fs.writeFileSync(unminifiedPath, content);

        // Minified version
        const minifiedContent = this.minifyCSS(content);
        const minifiedFileName = `${baseName}.min.css`;
        const minifiedPath = path.join(outputDir, minifiedFileName);
        fs.writeFileSync(minifiedPath, minifiedContent);

        // Update manifest with both versions
        this.manifest[relativePath] = {
            unminified: unminifiedFileName,
            minified: minifiedFileName
        };
    }

    /**
     * Extract npm dependencies from JS content
     */
    extractDependencies(content) {
        const importRegex = /(?:import\s+.*?\s+from\s+['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\))/g;
        let match;

        while ((match = importRegex.exec(content)) !== null) {
            const dep = match[1] || match[2];
            if (dep && !dep.startsWith('.') && !dep.startsWith('/')) {
                this.dependencies.add(dep);
            }
        }
    }

    /**
     * Check if JS needs transpilation
     */
    needsTranspilation(content) {
        return /(?:import\s|export\s|class\s|const\s|let\s|arrow function|\?\.|async\s|await\s)/.test(content);
    }

    /**
     * Transpile JavaScript using Babel
     */
    async transpileJS(content) {
        try {
            if (!this.isBabelAvailable()) {
                return content;
            }

            // Use Babel to transpile
            const runner = this.getPackageRunner();
            const result = execSync(`echo '${content.replace(/'/g, "\\'")}' | ${runner} babel --presets=@babel/preset-env`, {
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'pipe']
            });
            return result;
        } catch (error) {
            return content;
        }
    }

    /**
     * Minify JavaScript using Terser
     */
    async minifyJS(content) {
        try {
            // Check if Terser is available
            if (!this.isTerserAvailable()) {
                console.warn('⚠️  Terser not found, using unminified content');
                return content;
            }

            // Use Terser for proper minification
            const { minify } = require('terser');
            const result = await minify(content, {
                compress: {
                    dead_code: true,
                    drop_console: false,
                    drop_debugger: true,
                    keep_classnames: false,
                    keep_fargs: true,
                    keep_fnames: false,
                    keep_infinity: false,
                },
                mangle: false, // Don't mangle variable names for WordPress compatibility
                format: {
                    comments: false,
                    beautify: false,
                }
            });

            return result.code || content;
        } catch (error) {
            console.warn('⚠️  JS minification failed:', error.message);
            return content;
        }
    }

    /**
     * Minify CSS
     */
    minifyCSS(content) {
        return content
            .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .replace(/;\s*}/g, '}') // Remove semicolons before closing braces
            .replace(/\s*{\s*/g, '{') // Remove spaces around opening braces
            .replace(/\s*}\s*/g, '}') // Remove spaces around closing braces
            .replace(/\s*,\s*/g, ',') // Remove spaces around commas
            .replace(/\s*:\s*/g, ':') // Remove spaces around colons
            .replace(/\s*;\s*/g, ';') // Remove spaces around semicolons
            .trim();
    }

    /**
     * Generate asset manifest
     */
    generateManifest() {
        const manifestPath = path.join(this.config.output, 'manifest.json');
        fs.writeFileSync(manifestPath, JSON.stringify(this.manifest, null, 2));
        console.log(`📋 Generated manifest: ${manifestPath}`);
    }

    /**
     * Install discovered dependencies
     */
    async installDependencies() {
        if (this.dependencies.size > 0) {
            console.log(`📦 Installing dependencies: ${Array.from(this.dependencies).join(', ')}`);
            try {
                const pm = this.getPackageManager();
                execSync(`${pm} install ${Array.from(this.dependencies).join(' ')}`, { stdio: 'inherit' });
            } catch (error) {
                console.warn('⚠️  Some dependencies could not be installed automatically');
            }
        }
    }

    /**
     * Watch mode
     */
    watch() {
        console.log('👀 Watching for changes...');
        const chokidar = require('chokidar');

        Object.entries(this.config.entry).forEach(([entryName, entryPath]) => {
            if (fs.existsSync(entryPath)) {
                chokidar.watch(entryPath).on('change', async (changedFilePath) => {
                    console.log(`🔄 File changed: ${changedFilePath}`);
                    await this.rebuildSingleFile(changedFilePath, entryName);
                });
            }
        });
    }

    /**
     * Rebuild only the specific file that changed
     */
    async rebuildSingleFile(filePath, entryName) {
        try {
            const entryPath = this.config.entry[entryName];

            // Check if the changed file is processable
            if (!this.isProcessableFile(filePath)) {
                console.log(`⏭️  Skipping non-processable file: ${filePath}`);
                return;
            }

            console.log(`🔨 Rebuilding single file...`);

            // Process only this specific file
            await this.processFile(filePath, entryName);

            // Regenerate manifest to update the changed file entry
            this.generateManifest();

            console.log(`✅ Single file rebuild completed!`);

        } catch (error) {
            console.error(`❌ Error rebuilding file ${filePath}:`, error.message);
        }
    }

    /**
     * Get the appropriate package runner (npx or bunx)
     */
    getPackageRunner() {
        if (typeof Bun !== 'undefined' || process.versions.bun) {
            return 'bunx';
        }
        return 'npx';
    }

    /**
     * Get the appropriate package manager (npm or bun)
     */
    getPackageManager() {
        if (typeof Bun !== 'undefined' || process.versions.bun) {
            return 'bun';
        }
        return 'npm';
    }

    /**
     * Check if Sass is available
     */
    isSassAvailable() {
        try {
            const runner = this.getPackageRunner();
            execSync(`${runner} sass --version`, { stdio: 'ignore' });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Check if Babel is available
     */
    isBabelAvailable() {
        try {
            const runner = this.getPackageRunner();
            execSync(`${runner} babel --version`, { stdio: 'ignore' });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Check if Terser is available
     */
    isTerserAvailable() {
        try {
            require.resolve('terser');
            return true;
        } catch {
            return false;
        }
    }
}

module.exports = WordPressBundler;
