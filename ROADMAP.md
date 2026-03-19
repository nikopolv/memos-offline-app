# Memos Offline App - Development Roadmap

## Phase 1: Project Setup ✅
- [x] Initialize repository
- [x] Create README
- [x] Create roadmap
- [x] Set up Expo project with TypeScript
- [x] Create folder structure
- [x] Configure ESLint + Prettier (optional)

## Phase 2: Core Infrastructure ✅
- [x] SQLite database schema
- [x] Memos API client
- [x] Authentication flow (token-based)
- [x] Network state detection
- [x] Sync queue manager

## Phase 3: Data Layer ✅
- [x] Memo CRUD operations (local)
- [x] Tag management (via content parsing)
- [x] Conflict resolution strategy
- [x] Background sync implementation
- [x] Offline queue with retry logic

## Phase 4: UI Components ✅
- [x] App navigation (bottom tabs)
- [x] Memo list view
- [x] Memo editor (Markdown)
- [x] Search interface
- [x] Settings screen
- [x] Sync status indicator
- [x] Tag filter/selector

## Phase 5: Features
- [x] Full-text search (local)
- [x] Pin/unpin memos
- [x] Dark/light theme
- [x] Pull-to-refresh
- [x] Swipe actions (delete, pin)
- [ ] Share extension (Android/iOS)

## Phase 6: Polish & Deploy
- [x] Error handling & user feedback
- [x] Loading states
- [x] Empty states
- [x] App icon & splash screen
- [x] Build for Android APK
- [x] Build for iOS (TestFlight)
- [ ] macOS build (Catalyst)

---

## Architecture

```
src/
├── api/           # Memos API client
├── db/            # SQLite operations
├── sync/          # Sync engine
├── stores/        # Zustand stores
├── components/    # Reusable UI
├── screens/       # App screens
├── navigation/    # React Navigation
├── utils/         # Helpers
└── types/         # TypeScript types
```

## Database Schema

```sql
-- Memos table
CREATE TABLE memos (
  id TEXT PRIMARY KEY,
  server_id TEXT,
  content TEXT NOT NULL,
  visibility TEXT DEFAULT 'PRIVATE',
  pinned INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  synced_at TEXT,
  sync_status TEXT DEFAULT 'pending' -- pending, synced, conflict
);

-- Tags table
CREATE TABLE tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL
);

-- Memo-Tag junction
CREATE TABLE memo_tags (
  memo_id TEXT,
  tag_id INTEGER,
  PRIMARY KEY (memo_id, tag_id)
);

-- Sync queue
CREATE TABLE sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  memo_id TEXT NOT NULL,
  action TEXT NOT NULL, -- create, update, delete
  created_at TEXT NOT NULL,
  retry_count INTEGER DEFAULT 0
);
```

## Sync Strategy

1. **On memo create/edit**: Save locally, add to sync queue
2. **On network available**: Process sync queue in order
3. **On app foreground**: Pull latest from server
4. **Conflict resolution**: Server wins, but keep local as "conflicted copy"
