# Webpack → Vite Migration + Tailwind v4

**Date:** 2026-05-03  
**Branch:** `updating-dependencies`

## Goal

Replace webpack with Vite for bundling and dev server. Add Tailwind v4. Update all dependencies to current versions. Keep all existing functionality identical — no feature changes.

## Packages

### Remove

| Package | Reason |
|---|---|
| `webpack`, `webpack-cli`, `webpack-dev-server` | Replaced by Vite |
| `ts-loader` | Vite handles TS via esbuild |
| `css-loader`, `sass-loader`, `mini-css-extract-plugin` | Vite handles CSS/SCSS natively |
| `html-webpack-plugin` | Vite uses root `index.html` directly |
| `copy-webpack-plugin` | Unused (commented out in config) |
| `ttypescript` | Webpack-specific TS compiler wrapper |
| `typescript-plugin-styled-components` | Webpack-specific; replaced by `vite-plugin-styled-components` |
| `ts-react-display-name` | Webpack-specific; covered by Vite plugin |
| `buffer` | Polyfill not used in source |
| `@types/webpack*`, `@types/copy-webpack-plugin`, `@types/html-webpack-plugin`, `@types/mini-css-extract-plugin`, `@types/sass-loader` | Types for removed packages |
| `webpack.config.js` | Replaced by `vite.config.ts` |

### Add

| Package | Purpose |
|---|---|
| `vite` | Bundler + dev server |
| `@vitejs/plugin-react` | React JSX transform, Fast Refresh |
| `vite-plugin-styled-components` | Display names + SSR compat for styled-components |
| `@tailwindcss/vite` | Tailwind v4 Vite plugin |
| `tailwindcss@^4` | CSS framework |
| `sass` | SCSS support (Vite uses directly, no loader) |

### Keep / Update

`styled-components`, `react`, `react-dom`, `humps`, `@preact/signals-react`, `typescript`, `standard-version` — update to latest compatible versions.

## New Files

### `index.html` (root)

Vite requires `index.html` at project root as entry point. Move content from `src/assets/index.html`, replacing HtmlWebpackPlugin template syntax with static content. Script tag pointing to `src/index.tsx` added by Vite convention:

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Knots</title>
  </head>
  <body>
    <script type="module" src="/src/index.tsx"></script>
  </body>
</html>
```

### `vite.config.ts`

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import styledComponents from 'vite-plugin-styled-components'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    styledComponents(),
    tailwindcss(),
  ],
  build: {
    outDir: 'docs',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
  },
  server: {
    port: 3200,
  },
}))
```

### `src/styles/tailwind.css`

```css
@import "tailwindcss";
```

Import this in `src/index.tsx` or `src/App.tsx`.

## Modified Files

### `tsconfig.json`

- `moduleResolution`: `node` → `bundler`
- `jsx`: `react` → `react-jsx` (no need for explicit `React` import)

### `package.json` scripts

```json
"build": "pnpm run build:prod",
"dev": "vite",
"build:dev": "vite build --mode development",
"build:prod": "vite build",
"start:dev": "vite",
"test": "tsc --noEmit",
"prebuild": "pnpm test"
```

`release` and `postrelease` scripts remain unchanged.

## Tailwind v4 Notes

- No `tailwind.config.js` needed — v4 is CSS-first
- Configuration (if needed) goes in CSS via `@theme` directive
- `@tailwindcss/vite` plugin handles PostCSS integration automatically

## Source Maps

Webpack used `SourceMapDevToolPlugin` excluding `vendors.js`. Vite's `build.sourcemap: true` generates source maps for all chunks. This is equivalent behavior.

## Dev Server

Port stays `3200`. Vite dev server provides HMR by default.

## Build Output

Production build outputs to `docs/` — same as current webpack prod build. `standard-version` postchangelog script (`pnpm run build:prod`) remains valid.

## Cleanup

- Delete `webpack.config.js`
- Delete `src/assets/index.html` (replaced by root `index.html`)
- Delete `yarn.lock` (repo uses pnpm)

## What Does NOT Change

- All source files in `src/` — zero modifications to application logic
- SCSS files — Vite handles them identically
- `styled-components` usage — plugin provides same display name behavior
- `standard-version` release workflow
- Git history, `docs/` output directory
