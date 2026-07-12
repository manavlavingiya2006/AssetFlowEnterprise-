BEGIN TRANSACTION;
CREATE TABLE activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT,
  details TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "activity_logs" VALUES(1,1,'System Seed','Demo data loaded for hackathon presentation','2026-07-12 04:15:15');
CREATE TABLE allocations (
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
INSERT INTO "allocations" VALUES(1,1,4,1,'2026-06-12','2026-07-10',NULL,'Active',NULL);
INSERT INTO "allocations" VALUES(2,3,5,3,'2026-06-27','2026-07-22',NULL,'Active',NULL);
CREATE TABLE assets (
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
INSERT INTO "assets" VALUES(1,'AF-0001','Dell Latitude 5440 Laptop',1,'SN-DL5440-01','2023-03-10',78000.0,'Good','IT Floor 2',1,0,'Allocated',4,'2026-07-12 04:15:15');
INSERT INTO "assets" VALUES(2,'AF-0002','HP LaserJet Printer',1,'SN-HPLJ-22','2019-06-15',21000.0,'Fair','IT Floor 2',1,0,'Available',NULL,'2026-07-12 04:15:15');
INSERT INTO "assets" VALUES(3,'AF-0003','Ergonomic Office Chair',2,'SN-CHR-101','2022-01-05',9500.0,'Good','Operations Wing',3,0,'Allocated',5,'2026-07-12 04:15:15');
INSERT INTO "assets" VALUES(4,'AF-0004','Toyota Innova (Fleet Vehicle)',3,'GJ01-AB-1234','2021-11-20',1450000.0,'Good','Basement Parking',3,1,'Available',NULL,'2026-07-12 04:15:15');
INSERT INTO "assets" VALUES(5,'AF-0005','Conference Room B2',4,'ROOM-B2','2018-01-01',0.0,'Good','3rd Floor',3,1,'Available',NULL,'2026-07-12 04:15:15');
INSERT INTO "assets" VALUES(6,'AF-0006','MacBook Pro 14"',1,'SN-MBP14-09','2024-02-14',165000.0,'Good','Finance Floor 1',4,0,'Available',NULL,'2026-07-12 04:15:15');
INSERT INTO "assets" VALUES(7,'AF-0007','Projector Epson EB-X06',1,'SN-EPX06-3','2020-08-01',32000.0,'Under Repair','HR Floor 1',2,0,'Under Maintenance',NULL,'2026-07-12 04:15:15');
INSERT INTO "assets" VALUES(8,'AF-0008','Standing Desk',2,'SN-DSK-77','2022-09-09',14000.0,'Good','IT Floor 2',1,0,'Available',NULL,'2026-07-12 04:15:15');
INSERT INTO "assets" VALUES(9,'AF-0009','Meeting Room A1',4,'ROOM-A1','2018-01-01',0.0,'Good','2nd Floor',1,1,'Available',NULL,'2026-07-12 04:15:15');
INSERT INTO "assets" VALUES(10,'AF-0010','Old Scanner (Retired)',1,'SN-SCN-01','2015-04-01',8000.0,'Poor','Storage',1,0,'Retired',NULL,'2026-07-12 04:15:15');
CREATE TABLE audit_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cycle_id INTEGER NOT NULL,
  auditor_id INTEGER NOT NULL
);
INSERT INTO "audit_assignments" VALUES(1,1,2);
CREATE TABLE audit_cycles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  scope_department_id INTEGER,
  location TEXT,
  start_date TEXT,
  end_date TEXT,
  status TEXT DEFAULT 'Open', -- Open, Closed
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "audit_cycles" VALUES(1,'Q3 2026 IT Asset Audit',1,'IT Floor 2','2026-07-07','2026-07-17','Open','2026-07-12 04:15:15');
CREATE TABLE audit_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cycle_id INTEGER NOT NULL,
  asset_id INTEGER NOT NULL,
  result TEXT DEFAULT 'Pending', -- Pending, Verified, Missing, Damaged
  notes TEXT
);
INSERT INTO "audit_items" VALUES(1,1,1,'Verified',NULL);
INSERT INTO "audit_items" VALUES(2,1,2,'Pending',NULL);
INSERT INTO "audit_items" VALUES(3,1,8,'Damaged',NULL);
CREATE TABLE bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id INTEGER NOT NULL,
  booked_by INTEGER,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  purpose TEXT,
  status TEXT DEFAULT 'Upcoming', -- Upcoming, Ongoing, Completed, Cancelled
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "bookings" VALUES(1,5,6,'2026-07-13 09:00:00','2026-07-13 10:00:00','Sprint Planning','Upcoming','2026-07-12 04:15:15');
INSERT INTO "bookings" VALUES(2,5,7,'2026-07-13 10:00:00','2026-07-13 11:00:00','Client Call','Upcoming','2026-07-12 04:15:15');
INSERT INTO "bookings" VALUES(3,4,5,'2026-07-14 08:00:00','2026-07-14 12:00:00','Site Visit','Upcoming','2026-07-12 04:15:15');
CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  extra_fields TEXT DEFAULT '[]'
);
INSERT INTO "categories" VALUES(1,'Electronics','["Warranty Period"]');
INSERT INTO "categories" VALUES(2,'Furniture','[]');
INSERT INTO "categories" VALUES(3,'Vehicles','["Registration No"]');
INSERT INTO "categories" VALUES(4,'Meeting Rooms','[]');
CREATE TABLE departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  head_id INTEGER,
  parent_id INTEGER,
  status TEXT DEFAULT 'Active'
);
INSERT INTO "departments" VALUES(1,'Information Technology',2,NULL,'Active');
INSERT INTO "departments" VALUES(2,'Human Resources',NULL,NULL,'Active');
INSERT INTO "departments" VALUES(3,'Operations',3,NULL,'Active');
INSERT INTO "departments" VALUES(4,'Finance',NULL,NULL,'Active');
CREATE TABLE maintenance_requests (
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
INSERT INTO "maintenance_requests" VALUES(1,7,6,'Projector bulb not working','High',NULL,'Approved',NULL,NULL,'2026-07-09 04:15:15',NULL);
INSERT INTO "maintenance_requests" VALUES(2,2,4,'Paper jam frequently','Low',NULL,'Pending',NULL,NULL,'2026-07-11 04:15:15',NULL);
CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  type TEXT,
  message TEXT,
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "notifications" VALUES(1,4,'Asset Assigned','Asset AF-0001 (Dell Latitude 5440 Laptop) has been allocated to you',0,'2026-07-12 04:15:15');
INSERT INTO "notifications" VALUES(2,5,'Transfer Requested','You requested a transfer for AF-0001',0,'2026-07-12 04:15:15');
INSERT INTO "notifications" VALUES(3,2,'Audit Assigned','You have been assigned to audit cycle "Q3 2026 IT Asset Audit"',0,'2026-07-12 04:15:15');
CREATE TABLE transfers (
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
INSERT INTO "transfers" VALUES(1,1,4,5,5,'Requested','2026-07-11 04:15:15',NULL,NULL);
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'Employee', -- Admin, Asset Manager, Department Head, Employee
  department_id INTEGER,
  status TEXT DEFAULT 'Active',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "users" VALUES(1,'Alex Admin','admin@assetflow.com','$2b$08$nw9fw0XBY1R01SkObRexIOqFavAdJcKv3xi2fJOgNmchNB6ivbqfa','Admin',1,'Active','2026-07-12 04:15:15');
INSERT INTO "users" VALUES(2,'Meera Asset-Manager','manager@assetflow.com','$2b$08$wqqKsLVvgj7EeQd/9L4Y2ey5p7NURZs31zchr/IenEoFUeVm0lBN6','Asset Manager',1,'Active','2026-07-12 04:15:15');
INSERT INTO "users" VALUES(3,'Rohan Dept-Head','rohan.head@assetflow.com','$2b$08$SUJWGjBFfAE66lUW4tMSYOd8nVQ8sQCkXqHahiErApVmm0rtHs8eC','Department Head',3,'Active','2026-07-12 04:15:15');
INSERT INTO "users" VALUES(4,'Priya Sharma','priya@assetflow.com','$2b$08$bkQb5MsdGRYA3Exu/MRbm.jkDbmagztdAegixWP5cGvgXN200PYFa','Employee',1,'Active','2026-07-12 04:15:15');
INSERT INTO "users" VALUES(5,'Raj Verma','raj@assetflow.com','$2b$08$cbGsfb1p0y7r1B.o4fpZWOZ1yGnuu5pCUpjTdaGGbBK5bFq8IcP9e','Employee',3,'Active','2026-07-12 04:15:15');
INSERT INTO "users" VALUES(6,'Anita Desai','anita@assetflow.com','$2b$08$/htT6XO4H6q9xPI41EMVK.lzWIILCVfrj89T59iRretNx8.MIhTCC','Employee',2,'Active','2026-07-12 04:15:15');
INSERT INTO "users" VALUES(7,'Sam Iyer','sam@assetflow.com','$2b$08$hYzgrsc.crBHQ6uQlFenxOYfmjsaLFmCEtAkqQLgf4EcUpmxWYmLe','Employee',4,'Active','2026-07-12 04:15:15');
DELETE FROM "sqlite_sequence";
INSERT INTO "sqlite_sequence" VALUES('departments',4);
INSERT INTO "sqlite_sequence" VALUES('users',7);
INSERT INTO "sqlite_sequence" VALUES('categories',4);
INSERT INTO "sqlite_sequence" VALUES('assets',10);
INSERT INTO "sqlite_sequence" VALUES('allocations',2);
INSERT INTO "sqlite_sequence" VALUES('transfers',1);
INSERT INTO "sqlite_sequence" VALUES('bookings',3);
INSERT INTO "sqlite_sequence" VALUES('maintenance_requests',2);
INSERT INTO "sqlite_sequence" VALUES('audit_cycles',1);
INSERT INTO "sqlite_sequence" VALUES('audit_assignments',1);
INSERT INTO "sqlite_sequence" VALUES('audit_items',3);
INSERT INTO "sqlite_sequence" VALUES('notifications',3);
INSERT INTO "sqlite_sequence" VALUES('activity_logs',1);
COMMIT;
