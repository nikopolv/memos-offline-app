# Dart Tasks

## Done
- [x] Prevent token input auto-formatting on mobile login (`LoginScreen` access token field now disables auto-capitalization and autocorrect).
- [x] Add focused unit/integration coverage for login credential entry behavior. (`src/screens/loginCredentials.test.ts`)
- [x] Align login credential helper URL normalization with auth flow (`normalizeServerUrl` now trims, auto-prepends protocol, and strips trailing slashes; tested in `src/screens/loginCredentials.test.ts`).
- [x] Remove the hardcoded Memos API `users/1` parent assumption and cover client fallback/caching behavior. (`src/api/client.ts`, `src/api/client.test.ts`)

## Next
- [ ] Add a real web/PWA `build` script so the required `npm run build` check is executable in CI and local workflow.
