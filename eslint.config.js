// Flat-config ESLint setup for an Electron main + preload + renderer project.
// Lenient by default — extend as you grow.

const js = require('@eslint/js');

module.exports = [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'commonjs',
      globals: {
        // Node / Electron globals
        require: 'readonly',
        module: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        global: 'readonly',
        exports: 'readonly',
        // Electron globals used in main / preload
        app: 'readonly',
        BrowserWindow: 'readonly',
        ipcMain: 'readonly',
        shell: 'readonly',
        Tray: 'readonly',
        Menu: 'readonly',
        dialog: 'readonly',
        nativeTheme: 'readonly',
        globalShortcut: 'readonly',
        nativeImage: 'readonly',
        screen: 'readonly',
        contextBridge: 'readonly',
        ipcRenderer: 'readonly',
        // Browser globals used in index.html
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-console': 'off',
      'prefer-const': 'warn',
      eqeqeq: ['error', 'smart'],
      'no-var': 'error',
    },
  },
  {
    // Test files, generated assets, and bundled output get a free pass
    ignores: ['node_modules/**', 'dist/**', '*.bundle', 'docs/**', 'tests/**', 'coverage/**', '**/*.mjs'],
  },
];
