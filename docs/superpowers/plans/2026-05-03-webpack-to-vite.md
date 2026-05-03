# Webpack → Vite Migration + Tailwind v4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace webpack with Vite, add Tailwind v4, update all deps — zero changes to application logic.

**Architecture:** Delete webpack config and all webpack-specific packages. Create `vite.config.ts` and root `index.html`. Update `tsconfig.json` for Vite's bundler module resolution. Add Tailwind v4 via `@tailwindcss/vite` plugin with a single CSS import.

**Tech Stack:** Vite 6, `@vitejs/plugin-react`, `vite-plugin-styled-components`, `@tailwindcss/vite`, Tailwind v4, TypeScript, React 18, styled-components, pnpm

---

### Task 1: Create branch and remove webpack packages

**Files:**
- Modify: `package.json`
- Delete: `webpack.config.js`
- Delete: `yarn.lock`

- [ ] **Step 1: Create branch**

```bash
git checkout -b updating-dependencies
```

- [ ] **Step 2: Remove webpack and loader packages**

```bash
pnpm remove webpack webpack-cli webpack-dev-server ts-loader css-loader sass-loader mini-css-extract-plugin html-webpack-plugin copy-webpack-plugin ttypescript typescript-plugin-styled-components ts-react-display-name buffer
```

- [ ] **Step 3: Remove webpack-related devDependency types**

```bash
pnpm remove @types/copy-webpack-plugin @types/html-webpack-plugin @types/mini-css-extract-plugin @types/sass-loader @types/webpack @types/webpack-dev-server
```

- [ ] **Step 4: Delete webpack config and yarn lockfile**

```bash
rm webpack.config.js yarn.lock
```

- [ ] **Step 5: Verify package.json has no webpack references**

```bash
grep -i webpack package.json
```

Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: remove webpack and webpack-specific packages"
```

---

### Task 2: Install Vite and plugins

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install Vite and React plugin**

```bash
pnpm add -D vite @vitejs/plugin-react
```

- [ ] **Step 2: Install styled-components Vite plugin**

```bash
pnpm add -D vite-plugin-styled-components
```

- [ ] **Step 3: Install Tailwind v4 and its Vite plugin**

```bash
pnpm add -D tailwindcss @tailwindcss/vite
```

- [ ] **Step 4: Install sass (Vite uses it directly — no loader needed)**

```bash
pnpm add -D sass
```

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: install vite, plugins, tailwind v4, sass"
```

---

### Task 3: Update remaining dependencies to latest

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Update core runtime deps**

```bash
pnpm update react react-dom styled-components humps @preact/signals-react
```

- [ ] **Step 2: Update TypeScript and type packages**

```bash
pnpm update typescript @types/react @types/react-dom @types/humps @types/styled-components @types/node
```

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: update runtime and type dependencies to latest"
```

---

### Task 4: Create `vite.config.ts`

**Files:**
- Create: `vite.config.ts`

- [ ] **Step 1: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import styledComponents from 'vite-plugin-styled-components'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
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
})
```

- [ ] **Step 2: Commit**

```bash
git add vite.config.ts
git commit -m "chore: add vite.config.ts"
```

---

### Task 5: Create root `index.html`

**Files:**
- Create: `index.html`
- Delete: `src/assets/index.html`

Vite requires `index.html` at the project root (not inside `src/`). It serves as the entry point. The `<script>` tag pointing to `src/index.tsx` tells Vite where to start bundling.

- [ ] **Step 1: Create root index.html**

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

Save as `index.html` at project root.

- [ ] **Step 2: Delete the old HtmlWebpackPlugin template**

```bash
rm src/assets/index.html
```

- [ ] **Step 3: Commit**

```bash
git add index.html
git rm src/assets/index.html
git commit -m "chore: add vite root index.html, remove webpack html template"
```

---

### Task 6: Update `tsconfig.json` for Vite

**Files:**
- Modify: `tsconfig.json`

Vite uses esbuild to compile TypeScript. Two tsconfig changes needed:
- `moduleResolution: bundler` — tells TS to use Vite/bundler resolution rules (supports exports field, etc.)
- `jsx: react-jsx` — uses React 17+ automatic JSX transform (no need for `import React` in every file, though existing imports are harmless)

- [ ] **Step 1: Update tsconfig.json**

Replace the existing content with:

```json
{
  "compilerOptions": {
    "baseUrl": "src",
    "allowJs": false,
    "allowSyntheticDefaultImports": true,
    "jsx": "react-jsx",
    "lib": [ "esnext", "dom" ],
    "module": "esnext",
    "noImplicitAny": false,
    "outDir": "./dist/",
    "preserveConstEnums": true,
    "removeComments": true,
    "target": "es2020",
    "moduleResolution": "bundler",
    "skipLibCheck": true
  },
  "exclude": [
    "node_modules",
    "dist"
  ],
  "include": [
    "src/**/*"
  ]
}
```

- [ ] **Step 2: Run type check to verify no regressions**

```bash
pnpm test
```

Expected: exits with code 0, no type errors. If errors appear, they indicate pre-existing issues or import path problems — fix before proceeding.

- [ ] **Step 3: Commit**

```bash
git add tsconfig.json
git commit -m "chore: update tsconfig for vite bundler resolution and react-jsx"
```

---

### Task 7: Add Tailwind CSS entry point

**Files:**
- Create: `src/styles/tailwind.css`
- Modify: `src/index.tsx`

Tailwind v4 is CSS-first — no config file needed. A single `@import "tailwindcss"` in a CSS file activates it. The `@tailwindcss/vite` plugin processes it automatically.

- [ ] **Step 1: Create tailwind.css**

Create `src/styles/tailwind.css`:

```css
@import "tailwindcss";
```

- [ ] **Step 2: Import tailwind.css in src/index.tsx**

Open `src/index.tsx`. Current content:

```typescript
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

const container = document.createElement('section');
const root = createRoot(container);
const element = (
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
// container.id = 'knots';
document.body.appendChild(container);
root.render(element);
```

Add the Tailwind import at the top:

```typescript
import './styles/tailwind.css';
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

const container = document.createElement('section');
const root = createRoot(container);
const element = (
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
// container.id = 'knots';
document.body.appendChild(container);
root.render(element);
```

- [ ] **Step 3: Commit**

```bash
git add src/styles/tailwind.css src/index.tsx
git commit -m "chore: add tailwind v4 css entry point"
```

---

### Task 8: Update package.json scripts

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Update scripts in package.json**

Replace the `scripts` block in `package.json` with:

```json
"scripts": {
  "prebuild": "pnpm test",
  "build": "pnpm run build:prod",
  "dev": "vite",
  "build:dev": "vite build --mode development",
  "build:prod": "vite build",
  "start:dev": "vite",
  "test": "tsc --noEmit",
  "release": "standard-version -a",
  "postrelease": "git push --follow-tags origin main",
  "types": "pnpm dlx types-installer install"
},
```

- [ ] **Step 2: Verify dev server starts**

```bash
pnpm dev
```

Expected: Vite dev server starts on `http://localhost:3200`, no errors in terminal. Open browser to verify app loads. Stop with Ctrl+C.

- [ ] **Step 3: Verify production build**

```bash
pnpm build:prod
```

Expected: outputs to `docs/` directory, no errors. Check `docs/` contains `index.html` and JS/CSS assets.

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "chore: update scripts for vite"
```

---

### Task 9: Final verification and cleanup

**Files:**
- No new files

- [ ] **Step 1: Run type check**

```bash
pnpm test
```

Expected: exits 0, no errors.

- [ ] **Step 2: Run production build**

```bash
pnpm build:prod
```

Expected: `docs/` populated with `index.html`, `assets/` folder containing JS and CSS bundles.

- [ ] **Step 3: Smoke test dev server**

```bash
pnpm dev
```

Open `http://localhost:3200` in browser. Verify:
- App loads without console errors
- SCSS styles apply correctly
- styled-components render with display names visible in React DevTools
- Stop with Ctrl+C.

- [ ] **Step 4: Verify no webpack references remain in package.json**

```bash
grep -i "webpack\|ts-loader\|ttypescript\|buffer" package.json
```

Expected: no output.

- [ ] **Step 5: Final commit if any stray changes**

```bash
git status
```

If clean, done. If uncommitted changes exist, add and commit them:

```bash
git add -u
git commit -m "chore: final cleanup"
```
