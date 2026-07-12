
# AssetFlow — Database

AssetFlow uses **SQLite** (via `better-sqlite3`) as an embedded, file-based
database — no separate DB server to install or run, which keeps setup fast
for a hackathon demo.

## Files in this folder

| File              | Purpose                                                                 |
|-------------------|--------------------------------------------------------------------------|
| `assetflow.db`    | The live SQLite database file the app actually reads/writes at runtime. |
| `schema.sql`      | Human-readable copy of the schema (14 tables) — for reference/review.   |
| `full_dump.sql`   | Complete SQL dump (schema + current seed data) — a portable backup you can replay to recreate `assetflow.db` from scratch. |
| `ER-diagram.md`   | Mermaid entity-relationship diagram of how the tables connect.          |

## How it's wired up

`backend/db.js` opens `../database/assetflow.db` on startup and runs
`CREATE TABLE IF NOT EXISTS ...` for every table, so the schema is
self-healing — if the `.db` file is missing, deleted, or fresh, the app
recreates the full structure automatically the next time it starts.

## Common tasks

**Reset the database to demo data:**
```bash
cd backend
rm ../database/assetflow.db     # delete the current file
node -e "require('./db')"       # recreate empty schema
node seed.js                    # reload demo departments/users/assets/etc.
```

**Rebuild from the SQL dump instead (schema + data in one shot):**
```bash
rm database/assetflow.db
sqlite3 database/assetflow.db < database/full_dump.sql
```

**Inspect the database directly:**
```bash
sqlite3 database/assetflow.db
sqlite> .tables
sqlite> select * from users;
```

## Demo login credentials (after seeding)

| Role             | Email                     | Password    |
|------------------|---------------------------|-------------|
| Admin            | admin@assetflow.com       | admin123    |
| Asset Manager    | manager@assetflow.com     | manager123  |
| Department Head  | rohan.head@assetflow.com  | rohan123    |
| Employee         | priya@assetflow.com       | priya123    |
| Employee         | raj@assetflow.com         | raj123      |
| Employee         | anita@assetflow.com       | anita123    |
| Employee         | sam@assetflow.com         | sam123      |

## Schema at a glance

14 tables covering the full asset lifecycle:
`departments`, `categories`, `users`, `assets`, `allocations`, `transfers`,
`bookings`, `maintenance_requests`, `audit_cycles`, `audit_assignments`,
`audit_items`, `notifications`, `activity_logs`.

See `ER-diagram.md` for how they relate to one another.
=======
# AssetFlowEnterprise-

