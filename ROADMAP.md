# Memos Offline App - Development Roadmap

## Phase 1: Project Setup ✅
- [x] Initialize repository
- [x] Create README
- [x] Create roadmap
- [x] Set up Expo project with TypeScript
- [x] Create folder structure
- [ ] Configure ESLint + Prettier

## Phase 2: Core Infrastructure
- [ ] SQLite database schema
- [ ] Memos API client
- [ ] Authentication flow (token-based)
- [ ] Network state detection
- [ ] Sync queue manager

## Phase 3: Data Layer
- [ ] Memo CRUD operations (local)
- [ ] Tag management
- [ ] Conflict resolution strategy
- [ ] Background sync implementation
- [ ] Offline queue with retry logic

## Phase 4: UI Components
- [ ] App navigation (bottom tabs)
- [ ] Memo list view
- [ ] Memo editor (Markdown)
- [ ] Tag filter/selector
- [ ] Search interface
- [ ] Settings screen
- [ ] Sync status indicator

## Phase 5: Features
- [ ] Full-text search (local)
- [ ] Pin/unpin memos
- [ ] Dark/light theme
- [ ] Pull-to-refresh
- [ ] Swipe actions (delete, pin)
- [ ] Share extension (Android/iOS)

## Phase 6: Polish & Deploy
- [ ] Error handling & user feedback
- [ ] Loading states
- [ ] Empty states
- [ ] App icon & splash screen
- [ ] Build for Android APK
- [ ] Build for iOS (TestFlight)
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
