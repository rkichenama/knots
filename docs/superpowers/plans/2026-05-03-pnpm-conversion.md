# pnpm Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the repository to use pnpm for dependency management and scripts.

**Architecture:** Remove legacy lockfiles, import dependencies into pnpm, update `package.json` scripts, and verify the build.

**Tech Stack:** pnpm, Node.js

---

### Task 1: Cleanup and Lockfile Import

**Files:**
- Modify: `.gitignore`
- Delete: `yarn.lock`, `package-lock.json`
- Create: `pnpm-lock.yaml`

- [ ] **Step 1: Remove legacy lockfiles and node_modules**
Run: `Remove-Item -Recurse -Force node_modules, yarn.lock, package-lock.json`

- [ ] **Step 2: Update .gitignore**
Ensure `.pnpm-debug.log*` is ignored (it's already there based on research).

- [ ] **Step 3: Import dependencies to pnpm**
Run: `pnpm import`
Expected: `pnpm-lock.yaml` is generated.

- [ ] **Step 4: Commit cleanup**
Run: `git add .gitignore package.json pnpm-lock.yaml; git rm yarn.lock package-lock.json; git commit -m "chore: migrate to pnpm lockfile"`

### Task 2: Update package.json Scripts

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Replace npm/npx with pnpm/pnpm dlx**
Update `scripts` and `standard-version` sections.

```json
{
  "scripts": {
    "prebuild": "pnpm test",
    "build": "pnpm run build:prod",
    "dev": "pnpm run start:dev",
    "build:dev": "webpack --mode development",
    "build:prod": "webpack --mode production --output-path docs",
    "start:dev": "webpack serve --mode development",
    "test": "tsc --noEmit --module commonjs",
    "release": "standard-version -a",
    "postrelease": "git push --follow-tags origin main",
    "types": "pnpm dlx types-installer install"
  },
  "standard-version": {
    "scripts": {
      "postchangelog": "pnpm run build:prod",
      "precommit": "git add -u ; git add ./docs/"
    }
  }
}
```

- [ ] **Step 2: Commit script changes**
Run: `git add package.json; git commit -m "chore: update scripts to use pnpm"`

### Task 3: Final Installation and Verification

**Files:**
- Create: `node_modules` (via pnpm)

- [ ] **Step 1: Run pnpm install**
Run: `pnpm install`

- [ ] **Step 2: Run tests**
Run: `pnpm test`
Expected: Type checking passes.

- [ ] **Step 3: Run build**
Run: `pnpm run build`
Expected: Webpack build completes successfully.

- [ ] **Step 4: Final commit**
Run: `git add . ; git commit -m "chore: finalize pnpm conversion"`
