# Source-Backed Upload Leftover Cleanup

Use this when test uploads leave extra lesson artifacts behind in the German B2 track.

## What it does
- identifies test-upload residue by provenance instead of filename vibes
- keeps the canonical lesson set intact
- removes stale scratch uploads, duplicate review packets, and dead indexes
- verifies that the remaining lesson corpus is still cleanly publishable

## Current German B2 rule
If the track is still restricted to the real lesson set, keep Lektion 1 and 2 and delete everything else only after provenance confirms it is test residue.

## Cleanup steps
1. Confirm the canonical lesson set.
2. List all uploaded, staged, and published artifacts tied to the test run.
3. Separate official lessons from scratch uploads and QA leftovers.
4. Delete confirmed residue only.
5. Update indexes, docs, and tests that still reference deleted artifacts.
6. Re-run verification so the remaining corpus still renders and publishes correctly.

## Don't do this
- Do not rewrite provenance to make leftovers look official.
- Do not delete by filename alone.
- Do not remove canonical lessons because they appear duplicated in an upload batch.
- Do not leave dead references in review packets or lesson indexes.

## Done when
- the canonical lesson set is intact
- the test leftovers are gone
- no published surface still points at deleted residue
- the next cleanup pass would not rediscover the same junk
