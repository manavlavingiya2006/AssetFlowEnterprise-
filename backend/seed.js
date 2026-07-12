const bcrypt = require('bcryptjs');
const db = require('./db');

console.log('Seeding AssetFlow demo data...');

// Clear existing data
['notifications','activity_logs','audit_items','audit_assignments','audit_cycles',
 'maintenance_requests','bookings','transfers','allocations','assets','categories',
 'users','departments'].forEach(t => db.prepare(`DELETE FROM ${t}`).run());
db.prepare("DELETE FROM sqlite_sequence").run();

const hash = (p) => bcrypt.hashSync(p, 8);

// --- Departments ---
const deptIT = db.prepare('INSERT INTO departments (name, status) VALUES (?,?)').run('Information Technology', 'Active').lastInsertRowid;
const deptHR = db.prepare('INSERT INTO departments (name, status) VALUES (?,?)').run('Human Resources', 'Active').lastInsertRowid;
const deptOps = db.prepare('INSERT INTO departments (name, status) VALUES (?,?)').run('Operations', 'Active').lastInsertRowid;
const deptFin = db.prepare('INSERT INTO departments (name, status) VALUES (?,?)').run('Finance', 'Active').lastInsertRowid;

// --- Users ---
const admin = db.prepare('INSERT INTO users (name,email,password,role,department_id,status) VALUES (?,?,?,?,?,?)')
  .run('Alex Admin', 'admin@assetflow.com', hash('admin123'), 'Admin', deptIT, 'Active').lastInsertRowid;

const manager = db.prepare('INSERT INTO users (name,email,password,role,department_id,status) VALUES (?,?,?,?,?,?)')
  .run('Meera Asset-Manager', 'manager@assetflow.com', hash('manager123'), 'Asset Manager', deptIT, 'Active').lastInsertRowid;

const deptHead = db.prepare('INSERT INTO users (name,email,password,role,department_id,status) VALUES (?,?,?,?,?,?)')
  .run('Rohan Dept-Head', 'rohan.head@assetflow.com', hash('rohan123'), 'Department Head', deptOps, 'Active').lastInsertRowid;

const priya = db.prepare('INSERT INTO users (name,email,password,role,department_id,status) VALUES (?,?,?,?,?,?)')
  .run('Priya Sharma', 'priya@assetflow.com', hash('priya123'), 'Employee', deptIT, 'Active').lastInsertRowid;

const raj = db.prepare('INSERT INTO users (name,email,password,role,department_id,status) VALUES (?,?,?,?,?,?)')
  .run('Raj Verma', 'raj@assetflow.com', hash('raj123'), 'Employee', deptOps, 'Active').lastInsertRowid;

const anita = db.prepare('INSERT INTO users (name,email,password,role,department_id,status) VALUES (?,?,?,?,?,?)')
  .run('Anita Desai', 'anita@assetflow.com', hash('anita123'), 'Employee', deptHR, 'Active').lastInsertRowid;

const sam = db.prepare('INSERT INTO users (name,email,password,role,department_id,status) VALUES (?,?,?,?,?,?)')
  .run('Sam Iyer', 'sam@assetflow.com', hash('sam123'), 'Employee', deptFin, 'Active').lastInsertRowid;

db.prepare('UPDATE departments SET head_id=? WHERE id=?').run(manager, deptIT);
db.prepare('UPDATE departments SET head_id=? WHERE id=?').run(deptHead, deptOps);

// --- Categories ---
const catElec = db.prepare('INSERT INTO categories (name, extra_fields) VALUES (?,?)')
  .run('Electronics', JSON.stringify(['Warranty Period'])).lastInsertRowid;
const catFurn = db.prepare('INSERT INTO categories (name, extra_fields) VALUES (?,?)')
  .run('Furniture', JSON.stringify([])).lastInsertRowid;
const catVeh = db.prepare('INSERT INTO categories (name, extra_fields) VALUES (?,?)')
  .run('Vehicles', JSON.stringify(['Registration No'])).lastInsertRowid;
const catRoom = db.prepare('INSERT INTO categories (name, extra_fields) VALUES (?,?)')
  .run('Meeting Rooms', JSON.stringify([])).lastInsertRowid;

// --- Assets ---
function addAsset(tag, name, category_id, serial, acqDate, cost, condition, location, dept, bookable, status, holder) {
  db.prepare(`INSERT INTO assets (tag,name,category_id,serial_number,acquisition_date,acquisition_cost,condition,location,department_id,bookable,status,current_holder_id)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(tag,name,category_id,serial,acqDate,cost,condition,location,dept,bookable?1:0,status,holder||null);
}

addAsset('AF-0001', 'Dell Latitude 5440 Laptop', catElec, 'SN-DL5440-01', '2023-03-10', 78000, 'Good', 'IT Floor 2', deptIT, 0, 'Allocated', priya);
addAsset('AF-0002', 'HP LaserJet Printer', catElec, 'SN-HPLJ-22', '2019-06-15', 21000, 'Fair', 'IT Floor 2', deptIT, 0, 'Available', null);
addAsset('AF-0003', 'Ergonomic Office Chair', catFurn, 'SN-CHR-101', '2022-01-05', 9500, 'Good', 'Operations Wing', deptOps, 0, 'Allocated', raj);
addAsset('AF-0004', 'Toyota Innova (Fleet Vehicle)', catVeh, 'GJ01-AB-1234', '2021-11-20', 1450000, 'Good', 'Basement Parking', deptOps, 1, 'Available', null);
addAsset('AF-0005', 'Conference Room B2', catRoom, 'ROOM-B2', '2018-01-01', 0, 'Good', '3rd Floor', deptOps, 1, 'Available', null);
addAsset('AF-0006', 'MacBook Pro 14"', catElec, 'SN-MBP14-09', '2024-02-14', 165000, 'Good', 'Finance Floor 1', deptFin, 0, 'Available', null);
addAsset('AF-0007', 'Projector Epson EB-X06', catElec, 'SN-EPX06-3', '2020-08-01', 32000, 'Under Repair', 'HR Floor 1', deptHR, 0, 'Under Maintenance', null);
addAsset('AF-0008', 'Standing Desk', catFurn, 'SN-DSK-77', '2022-09-09', 14000, 'Good', 'IT Floor 2', deptIT, 0, 'Available', null);
addAsset('AF-0009', 'Meeting Room A1', catRoom, 'ROOM-A1', '2018-01-01', 0, 'Good', '2nd Floor', deptIT, 1, 'Available', null);
addAsset('AF-0010', 'Old Scanner (Retired)', catElec, 'SN-SCN-01', '2015-04-01', 8000, 'Poor', 'Storage', deptIT, 0, 'Retired', null);

// --- Allocations (matching current holders) ---
db.prepare(`INSERT INTO allocations (asset_id, employee_id, department_id, allocated_date, expected_return_date, status) VALUES (1,?,?,date('now','-30 days'),date('now','-2 days'),'Active')`).run(priya, deptIT);
db.prepare(`INSERT INTO allocations (asset_id, employee_id, department_id, allocated_date, expected_return_date, status) VALUES (3,?,?,date('now','-15 days'),date('now','+10 days'),'Active')`).run(raj, deptOps);

// --- Transfers ---
db.prepare(`INSERT INTO transfers (asset_id, from_holder_id, to_holder_id, requested_by, status, requested_at) VALUES (1,?,?,?, 'Requested', datetime('now','-1 days'))`).run(priya, raj, raj);

// --- Bookings ---
function isoDate(daysFromNow) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}
const day1 = isoDate(1), day2 = isoDate(2);
db.prepare(`INSERT INTO bookings (asset_id, booked_by, start_time, end_time, purpose, status) VALUES (5,?,?,?, 'Sprint Planning','Upcoming')`).run(anita, `${day1} 09:00:00`, `${day1} 10:00:00`);
db.prepare(`INSERT INTO bookings (asset_id, booked_by, start_time, end_time, purpose, status) VALUES (5,?,?,?, 'Client Call','Upcoming')`).run(sam, `${day1} 10:00:00`, `${day1} 11:00:00`);
db.prepare(`INSERT INTO bookings (asset_id, booked_by, start_time, end_time, purpose, status) VALUES (4,?,?,?, 'Site Visit','Upcoming')`).run(raj, `${day2} 08:00:00`, `${day2} 12:00:00`);

// --- Maintenance requests ---
db.prepare(`INSERT INTO maintenance_requests (asset_id, raised_by, issue, priority, status, created_at) VALUES (7,?,'Projector bulb not working','High','Approved',datetime('now','-3 days'))`).run(anita);
db.prepare(`INSERT INTO maintenance_requests (asset_id, raised_by, issue, priority, status, created_at) VALUES (2,?,'Paper jam frequently','Low','Pending',datetime('now','-1 days'))`).run(priya);

// --- Audit cycle ---
const cycle = db.prepare(`INSERT INTO audit_cycles (name, scope_department_id, location, start_date, end_date, status) VALUES ('Q3 2026 IT Asset Audit', ?, 'IT Floor 2', date('now','-5 days'), date('now','+5 days'), 'Open')`).run(deptIT).lastInsertRowid;
db.prepare('INSERT INTO audit_assignments (cycle_id, auditor_id) VALUES (?,?)').run(cycle, manager);
db.prepare(`INSERT INTO audit_items (cycle_id, asset_id, result) VALUES (?,1,'Verified')`).run(cycle);
db.prepare(`INSERT INTO audit_items (cycle_id, asset_id, result) VALUES (?,2,'Pending')`).run(cycle);
db.prepare(`INSERT INTO audit_items (cycle_id, asset_id, result) VALUES (?,8,'Damaged')`).run(cycle);

// --- Notifications ---
db.prepare(`INSERT INTO notifications (user_id, type, message) VALUES (?,?,?)`).run(priya, 'Asset Assigned', 'Asset AF-0001 (Dell Latitude 5440 Laptop) has been allocated to you');
db.prepare(`INSERT INTO notifications (user_id, type, message) VALUES (?,?,?)`).run(raj, 'Transfer Requested', 'You requested a transfer for AF-0001');
db.prepare(`INSERT INTO notifications (user_id, type, message) VALUES (?,?,?)`).run(manager, 'Audit Assigned', 'You have been assigned to audit cycle "Q3 2026 IT Asset Audit"');

// --- Activity log ---
db.prepare(`INSERT INTO activity_logs (user_id, action, details) VALUES (?,?,?)`).run(admin, 'System Seed', 'Demo data loaded for hackathon presentation');

console.log('Seed complete!');
console.log('--------------------------------------------------');
console.log('Demo Login Credentials:');
console.log('  Admin:           admin@assetflow.com / admin123');
console.log('  Asset Manager:   manager@assetflow.com / manager123');
console.log('  Department Head: rohan.head@assetflow.com / rohan123');
console.log('  Employee (Priya):priya@assetflow.com / priya123');
console.log('  Employee (Raj):  raj@assetflow.com / raj123');
console.log('  Employee (Anita):anita@assetflow.com / anita123');
console.log('  Employee (Sam):  sam@assetflow.com / sam123');
console.log('--------------------------------------------------');
