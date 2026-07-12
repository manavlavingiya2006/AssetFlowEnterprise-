const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'assetflow.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  head_id INTEGER,
  parent_id INTEGER,
  status TEXT DEFAULT 'Active'
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  extra_fields TEXT DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'Employee', -- Admin, Asset Manager, Department Head, Employee
  department_id INTEGER,
  status TEXT DEFAULT 'Active',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tag TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category_id INTEGER,
  serial_number TEXT,
  acquisition_date TEXT,
  acquisition_cost REAL,
  condition TEXT DEFAULT 'Good',
  location TEXT,
  department_id INTEGER,
  bookable INTEGER DEFAULT 0,
  status TEXT DEFAULT 'Available', -- Available, Allocated, Reserved, Under Maintenance, Lost, Retired, Disposed
  current_holder_id INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS allocations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id INTEGER NOT NULL,
  employee_id INTEGER,
  department_id INTEGER,
  allocated_date TEXT DEFAULT CURRENT_TIMESTAMP,
  expected_return_date TEXT,
  returned_date TEXT,
  status TEXT DEFAULT 'Active', -- Active, Returned
  condition_notes TEXT
);

CREATE TABLE IF NOT EXISTS transfers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id INTEGER NOT NULL,
  from_holder_id INTEGER,
  to_holder_id INTEGER,
  requested_by INTEGER,
  status TEXT DEFAULT 'Requested', -- Requested, Approved, Rejected, Re-allocated
  requested_at TEXT DEFAULT CURRENT_TIMESTAMP,
  approved_at TEXT,
  approved_by INTEGER
);

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id INTEGER NOT NULL,
  booked_by INTEGER,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  purpose TEXT,
  status TEXT DEFAULT 'Upcoming', -- Upcoming, Ongoing, Completed, Cancelled
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS maintenance_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id INTEGER NOT NULL,
  raised_by INTEGER,
  issue TEXT,
  priority TEXT DEFAULT 'Medium',
  photo TEXT,
  status TEXT DEFAULT 'Pending', -- Pending, Approved, Rejected, Technician Assigned, In Progress, Resolved
  approved_by INTEGER,
  technician TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  resolved_at TEXT
);

CREATE TABLE IF NOT EXISTS audit_cycles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  scope_department_id INTEGER,
  location TEXT,
  start_date TEXT,
  end_date TEXT,
  status TEXT DEFAULT 'Open', -- Open, Closed
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cycle_id INTEGER NOT NULL,
  auditor_id INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cycle_id INTEGER NOT NULL,
  asset_id INTEGER NOT NULL,
  result TEXT DEFAULT 'Pending', -- Pending, Verified, Missing, Damaged
  notes TEXT
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  type TEXT,
  message TEXT,
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT,
  details TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

module.exports = db;
