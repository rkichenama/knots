# 2026-05-03 pnpm Conversion Design

## Goal
Convert the repository from using npm/yarn to pnpm as the primary package manager.

## Architecture
- **Dependency Management:** Use pnpm's content-addressable storage and symlinked `node_modules` for faster, more efficient dependency management.
- **Lockfile Migration:** Use `pnpm import` to generate `pnpm-lock.yaml` from existing lockfiles (`yarn.lock` preferred as it's usually more precise than older `package-lock.json`).
- **Script Consistency:** All lifecycle and utility scripts in `package.json` will be updated to use `pnpm` and `pnpm dlx`.

## Steps
1. **Clean Legacy State:** Remove `yarn.lock`, `package-lock.json`, and `node_modules`.
2. **Import Dependencies:** Run `pnpm import` to create `pnpm-lock.yaml`.
3. **Update package.json:** Replace `npm` and `npx` with `pnpm` and `pnpm dlx`.
4. **Verify:** Run `pnpm install`, `pnpm test`, and `pnpm run build`.
