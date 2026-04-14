# seed-content

Drop your creator content here before running the seeder.

## Folder structure per creator

```
seed-content/
└── <creator-handle>/
    ├── creator.json            (optional — overrides per-creator config)
    ├── assets/                 (public/priced media → assets table)
    │   ├── photo-1.jpg
    │   ├── clip.mp4
    │   └── ...
    ├── vault/                  (locked premium content → vault_items)
    │   ├── exclusive-1.jpg
    │   └── ...
    ├── payment-links/
    │   └── links.json          (Whop pay link definitions)
    └── drops/
        └── drops.json          (scarcity drop definitions)
```

## Supported media types

| Extension | Type |
|---|---|
| jpg, jpeg, png, gif, webp | image |
| mp4, mov, webm | video |
| mp3, wav, m4a | audio |
| pdf | document |

## Running

```bash
# All creators, all content types
npx tsx scripts/seed_from_folders.ts

# Dry run (no DB writes — just logs)
npx tsx scripts/seed_from_folders.ts --dry-run

# Single creator only
npx tsx scripts/seed_from_folders.ts --creator=anya

# Only seed vault + drops for one creator
npx tsx scripts/seed_from_folders.ts --creator=anya --only=vault,drops
```

## Notes

- `assets/` and `vault/` folders: drop raw media files here.
  The script uploads to Supabase Storage and inserts DB rows automatically.
- `assets/` goes into the `assets` table (public/priced content).
- `vault/` goes into the `vault_items` table (blurred preview, unlocked after payment).
- File names become the content title (underscores/hyphens → spaces, title-cased).
- The creator must already exist in `auth.users` + `profiles` before seeding.
  Run the app signup flow first.
- Media files in this folder are gitignored — add real files locally only.
