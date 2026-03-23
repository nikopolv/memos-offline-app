# Dart Tasks

## Done
- [x] Prevent token input auto-formatting on mobile login (`LoginScreen` access token field now disables auto-capitalization and autocorrect).
- [x] Add focused unit/integration coverage for login credential entry behavior. (`src/screens/loginCredentials.test.ts`)
- [x] Align login credential helper URL normalization with auth flow (`normalizeServerUrl` now trims, auto-prepends protocol, and strips trailing slashes; tested in `src/screens/loginCredentials.test.ts`).
- [x] Remove the hardcoded Memos API `users/1` parent assumption and cover client fallback/caching behavior. (`src/api/client.ts`, `src/api/client.test.ts`)
- [x] Add a real web/PWA `build` script so the required `npm run build` check is executable in CI and local workflow. (`package.json` now includes `build: expo export --platform web`; verified with successful `npm run build` export to `dist/`)
- [x] Surface sync queue state with retryable in-screen banners on the memo list, and exclude generated `dist/` output from TypeScript verification. (`src/screens/MemoListScreen.tsx`, `tsconfig.json`)
- [x] Replace the blocking memo-list spinner with card skeletons and tighten empty states around search, offline-first creation, and manual sync recovery. (`src/screens/MemoListScreen.tsx`)
- [x] Add a first-run onboarding gate on the login screen with a short setup checklist and persisted dismissal state. (`src/screens/LoginScreen.tsx`)
- [x] Replace hardcoded editor tag presets with reusable suggestions from existing memos and add a one-step custom tag inserter. (`src/screens/EditorScreen.tsx`)

## Next
- [ ] Run a mobile ergonomics and readability/accessibility pass across login, list, and editor surfaces.
