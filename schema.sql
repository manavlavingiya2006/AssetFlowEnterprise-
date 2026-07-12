-- ============================================================
-- AssetFlow — Database Schema (SQLite)
-- ============================================================
-- This file is the canonical, human-readable definition of the
-- AssetFlow schema. It is auto-created at runtime by
-- backend/db.js (using better-sqlite3), so you do NOT need to
-- run this file by hand to start the app — it's here for
-- documentation, review, and for judges/teammates who want to
-- inspect the data model without reading server code.
--
-- To (re)build a fresh database from just this file:
--   sqlite3 assetflow.db < schema.sql
-- ============================================================

PRAGMA foreign_keys = ON;

-- Departments within the organization
CREATE TABLE IF NOT EXISTS departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  head_id INTEGER,             -- FK -> users.id (department head)
  parent_id INTEGER,           -- FK -> departments.id (for sub-departments)
  status TEXT DEFAULT 'Active'
);

-- Asset categories (Electronics, Furniture, Vehicles, Meeting Rooms, ...)
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  extra_fields TEXT DEFAULT '[]'   -- JSON array of category-specific field names
);

-- System users / accounts
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,          -- bcrypt hash
  role TEXT DEFAULT 'Employee',    -- Admin, Asset Manager, Department Head, Employee
  department_id INTEGER,           -- FK -> departments.id
  status TEXT DEFAULT 'Active',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Physical / bookable assets
CREATE TABLE IF NOT EXISTS assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tag TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category_id INTEGER,             -- FK -> categories.id
  serial_number TEXT,
  acquisition_date TEXT,
  acquisition_cost REAL,
  condition TEXT DEFAULT 'Good',
  location TEXT,
  department_id INTEGER,           -- FK -> departments.id
  bookable INTEGER DEFAULT 0,      -- 1 = can be booked (e.g. meeting rooms, vehicles)
  status TEXT DEFAULT 'Available', -- Available, Allocated, Reserved, Under Maintenance, Lost, Retired, Disposed
  current_holder_id INTEGER,       -- FK -> users.id
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Allocation history: which employee/department is holding which asset
CREATE TABLE IF NOT EXISTS allocations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id INTEGER NOT NULL,       -- FK -> assets.id
  employee_id INTEGER,             -- FK -> users.id
  department_id INTEGER,           -- FK -> departments.id
  allocated_date TEXT DEFAULT CURRENT_TIMESTAMP,
  expected_return_date TEXT,
  returned_date TEXT,
  status TEXT DEFAULT 'Active',    -- Active, Returned
  condition_notes TEXT
);

-- Transfer requests (moving an asset from one holder to another)
CREATE TABLE IF NOT EXISTS transfers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id INTEGER NOT NULL,       -- FK -> assets.id
  from_holder_id INTEGER,          -- FK -> users.id
  to_holder_id INTEGER,            -- FK -> users.id
  requested_by INTEGER,            -- FK -> users.id
  status TEXT DEFAULT 'Requested', -- Requested, Approved, Rejected, Re-allocated
  requested_at TEXT DEFAULT CURRENT_TIMESTAMP,
  approved_at TEXT,
  approved_by INTEGER               -- FK -> users.id
);

-- Bookings for bookable assets (meeting rooms, fleet vehicles, ...)
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id INTEGER NOT NULL,       -- FK -> assets.id
  booked_by INTEGER,               -- FK -> users.id
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  purpose TEXT,
  status TEXT DEFAULT 'Upcoming',  -- Upcoming, Ongoing, Completed, Cancelled
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Maintenance / repair requests raised against an asset
CREATE TABLE IF NOT EXISTS maintenance_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id INTEGER NOT NULL,       -- FK -> assets.id
  raised_by INTEGER,               -- FK -> users.id
  issue TEXT,
  priority TEXT DEFAULT 'Medium',
  photo TEXT,
  status TEXT DEFAULT 'Pending',   -- Pending, Approved, Rejected, Technician Assigned, In Progress, Resolved
  approved_by INTEGER,             -- FK -> users.id
  technician TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  resolved_at TEXT
);

-- Audit cycles (periodic physical verification campaigns)
CREATE TABLE IF NOT EXISTS audit_cycles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  scope_department_id INTEGER,     -- FK -> departments.id
  location TEXT,
  start_date TEXT,
  end_date TEXT,
  status TEXT DEFAULT 'Open',      -- Open, Closed
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Auditors assigned to an audit cycle
CREATE TABLE IF NOT EXISTS audit_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cycle_id INTEGER NOT NULL,       -- FK -> audit_cycles.id
  auditor_id INTEGER NOT NULL      -- FK -> users.id
);

-- Individual asset check results within an audit cycle
CREATE TABLE IF NOT EXISTS audit_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cycle_id INTEGER NOT NULL,       -- FK -> audit_cycles.id
  asset_id INTEGER NOT NULL,       -- FK -> assets.id
  result TEXT DEFAULT 'Pending',   -- Pending, Verified, Missing, Damaged
  notes TEXT
);

-- In-app notifications
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,                 -- FK -> users.id
  type TEXT,
  message TEXT,
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- System-wide activity / audit trail log
CREATE TABLE IF NOT EXISTS activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,                 -- FK -> users.id
  action TEXT,
  details TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
