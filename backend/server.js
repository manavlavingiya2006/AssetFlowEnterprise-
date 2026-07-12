const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');
const { JWT_SECRET, authRequired, requireRole, notify, log } = require('./utils');
const { getAssistantReply } = require('./assistant');

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

const asJSON = (row) => row; // placeholder for future transforms

/* ---------------- AUTH ---------------- */

app.post('/api/auth/signup', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(400).json({ error: 'Email already registered' });
  const hash = bcrypt.hashSync(password, 8);
  // Signup ALWAYS creates a plain Employee account - no role selection allowed
  const info = db.prepare('INSERT INTO users (name, email, password, role, status) VALUES (?,?,?,?,?)')
    .run(name, email, hash, 'Employee', 'Active');
  log(info.lastInsertRowid, 'Signup', `${name} signed up as Employee`);
  res.json({ message: 'Account created. Please log in.' });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(400).json({ error: 'Invalid credentials' });
  if (user.status === 'Inactive') return res.status(403).json({ error: 'Account deactivated. Contact Admin.' });
  if (!bcrypt.compareSync(password, user.password)) return res.status(400).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '2d' });
  log(user.id, 'Login', `${user.name} logged in`);
  delete user.password;
  res.json({ token, user });
});

app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(404).json({ error: 'No account with that email' });
  // Simulated for demo purposes (no real email service)
  res.json({ message: 'Password reset link sent to your email (demo simulation).' });
});

app.get('/api/auth/me', authRequired, (req, res) => {
  const u = { ...req.user };
  delete u.password;
  res.json(u);
});

/* ---------------- DEPARTMENTS ---------------- */

app.get('/api/departments', authRequired, (req, res) => {
  res.json(db.prepare(`
    SELECT d.*, h.name as head_name, p.name as parent_name
    FROM departments d
    LEFT JOIN users h ON h.id = d.head_id
    LEFT JOIN departments p ON p.id = d.parent_id
    ORDER BY d.id`).all());
});

app.post('/api/departments', authRequired, requireRole('Admin'), (req, res) => {
  const { name, head_id, parent_id, status } = req.body;
  const info = db.prepare('INSERT INTO departments (name, head_id, parent_id, status) VALUES (?,?,?,?)')
    .run(name, head_id || null, parent_id || null, status || 'Active');
  log(req.user.id, 'Create Department', name);
  res.json({ id: info.lastInsertRowid });
});

app.put('/api/departments/:id', authRequired, requireRole('Admin'), (req, res) => {
  const { name, head_id, parent_id, status } = req.body;
  db.prepare('UPDATE departments SET name=?, head_id=?, parent_id=?, status=? WHERE id=?')
    .run(name, head_id || null, parent_id || null, status, req.params.id);
  log(req.user.id, 'Update Department', name);
  res.json({ message: 'Updated' });
});

/* ---------------- CATEGORIES ---------------- */

app.get('/api/categories', authRequired, (req, res) => {
  res.json(db.prepare('SELECT * FROM categories ORDER BY id').all());
});

app.post('/api/categories', authRequired, requireRole('Admin'), (req, res) => {
  const { name, extra_fields } = req.body;
  const info = db.prepare('INSERT INTO categories (name, extra_fields) VALUES (?,?)')
    .run(name, JSON.stringify(extra_fields || []));
  log(req.user.id, 'Create Category', name);
  res.json({ id: info.lastInsertRowid });
});

app.put('/api/categories/:id', authRequired, requireRole('Admin'), (req, res) => {
  const { name, extra_fields } = req.body;
  db.prepare('UPDATE categories SET name=?, extra_fields=? WHERE id=?')
    .run(name, JSON.stringify(extra_fields || []), req.params.id);
  res.json({ message: 'Updated' });
});

/* ---------------- EMPLOYEE DIRECTORY ---------------- */

app.get('/api/employees', authRequired, (req, res) => {
  const rows = db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.status, u.department_id, d.name as department_name
    FROM users u LEFT JOIN departments d ON d.id = u.department_id ORDER BY u.id`).all();
  res.json(rows);
});

app.put('/api/employees/:id', authRequired, requireRole('Admin'), (req, res) => {
  const { name, department_id, status } = req.body;
  db.prepare('UPDATE users SET name=?, department_id=?, status=? WHERE id=?')
    .run(name, department_id || null, status, req.params.id);
  log(req.user.id, 'Update Employee', `Updated employee #${req.params.id}`);
  res.json({ message: 'Updated' });
});

// Only place roles are assigned - Admin promotes an Employee
app.post('/api/employees/:id/promote', authRequired, requireRole('Admin'), (req, res) => {
  const { role } = req.body; // 'Department Head' or 'Asset Manager'
  if (!['Department Head', 'Asset Manager', 'Employee'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  db.prepare('UPDATE users SET role=? WHERE id=?').run(role, req.params.id);
  const emp = db.prepare('SELECT * FROM users WHERE id=?').get(req.params.id);
  notify(emp.id, 'Role Change', `You have been promoted to ${role}`);
  log(req.user.id, 'Promote Employee', `${emp.name} -> ${role}`);
  res.json({ message: 'Role updated' });
});

/* ---------------- ASSETS ---------------- */

function generateAssetTag() {
  const row = db.prepare("SELECT tag FROM assets ORDER BY id DESC LIMIT 1").get();
  let next = 1;
  if (row && row.tag) {
    const num = parseInt(row.tag.split('-')[1], 10);
    next = num + 1;
  }
  return 'AF-' + String(next).padStart(4, '0');
}

app.get('/api/assets', authRequired, (req, res) => {
  const { q, status, category_id, department_id, location } = req.query;
  let sql = `SELECT a.*, c.name as category_name, d.name as department_name, u.name as holder_name
             FROM assets a
             LEFT JOIN categories c ON c.id = a.category_id
             LEFT JOIN departments d ON d.id = a.department_id
             LEFT JOIN users u ON u.id = a.current_holder_id
             WHERE 1=1`;
  const params = [];
  if (q) { sql += ` AND (a.tag LIKE ? OR a.serial_number LIKE ? OR a.name LIKE ?)`; params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  if (status) { sql += ` AND a.status = ?`; params.push(status); }
  if (category_id) { sql += ` AND a.category_id = ?`; params.push(category_id); }
  if (department_id) { sql += ` AND a.department_id = ?`; params.push(department_id); }
  if (location) { sql += ` AND a.location LIKE ?`; params.push(`%${location}%`); }
  sql += ' ORDER BY a.id DESC';
  res.json(db.prepare(sql).all(...params));
});

app.get('/api/assets/:id', authRequired, (req, res) => {
  const asset = db.prepare(`SELECT a.*, c.name as category_name, d.name as department_name, u.name as holder_name
    FROM assets a LEFT JOIN categories c ON c.id=a.category_id LEFT JOIN departments d ON d.id=a.department_id
    LEFT JOIN users u ON u.id=a.current_holder_id WHERE a.id=?`).get(req.params.id);
  if (!asset) return res.status(404).json({ error: 'Not found' });
  const allocHistory = db.prepare(`SELECT al.*, u.name as employee_name FROM allocations al
    LEFT JOIN users u ON u.id = al.employee_id WHERE al.asset_id=? ORDER BY al.id DESC`).all(req.params.id);
  const maintHistory = db.prepare(`SELECT * FROM maintenance_requests WHERE asset_id=? ORDER BY id DESC`).all(req.params.id);
  res.json({ ...asset, allocation_history: allocHistory, maintenance_history: maintHistory });
});

app.post('/api/assets', authRequired, requireRole('Admin', 'Asset Manager'), (req, res) => {
  const { name, category_id, serial_number, acquisition_date, acquisition_cost, condition, location, department_id, bookable } = req.body;
  const tag = generateAssetTag();
  const info = db.prepare(`INSERT INTO assets (tag, name, category_id, serial_number, acquisition_date, acquisition_cost, condition, location, department_id, bookable, status)
    VALUES (?,?,?,?,?,?,?,?,?,?, 'Available')`)
    .run(tag, name, category_id || null, serial_number || null, acquisition_date || null, acquisition_cost || null, condition || 'Good', location || null, department_id || null, bookable ? 1 : 0);
  log(req.user.id, 'Register Asset', `${tag} - ${name}`);
  res.json({ id: info.lastInsertRowid, tag });
});

app.put('/api/assets/:id', authRequired, requireRole('Admin', 'Asset Manager'), (req, res) => {
  const { name, category_id, serial_number, condition, location, department_id, bookable, status } = req.body;
  db.prepare(`UPDATE assets SET name=?, category_id=?, serial_number=?, condition=?, location=?, department_id=?, bookable=?, status=? WHERE id=?`)
    .run(name, category_id || null, serial_number, condition, location, department_id || null, bookable ? 1 : 0, status, req.params.id);
  log(req.user.id, 'Update Asset', `Asset #${req.params.id}`);
  res.json({ message: 'Updated' });
});

/* ---------------- ALLOCATION & TRANSFER ---------------- */

app.post('/api/allocations', authRequired, requireRole('Admin', 'Asset Manager'), (req, res) => {
  const { asset_id, employee_id, department_id, expected_return_date } = req.body;
  const asset = db.prepare('SELECT * FROM assets WHERE id=?').get(asset_id);
  if (!asset) return res.status(404).json({ error: 'Asset not found' });

  if (asset.status === 'Allocated' || asset.current_holder_id) {
    const holder = db.prepare('SELECT name FROM users WHERE id=?').get(asset.current_holder_id);
    return res.status(409).json({
      error: `Asset is currently held by ${holder ? holder.name : 'someone else'}. Use Transfer Request instead.`,
      conflict: true, current_holder_id: asset.current_holder_id
    });
  }
  const info = db.prepare(`INSERT INTO allocations (asset_id, employee_id, department_id, expected_return_date, status)
    VALUES (?,?,?,?, 'Active')`).run(asset_id, employee_id || null, department_id || null, expected_return_date || null);
  db.prepare(`UPDATE assets SET status='Allocated', current_holder_id=? WHERE id=?`).run(employee_id || null, asset_id);
  if (employee_id) notify(employee_id, 'Asset Assigned', `Asset ${asset.tag} (${asset.name}) has been allocated to you`);
  log(req.user.id, 'Allocate Asset', `${asset.tag} -> user ${employee_id}`);
  res.json({ id: info.lastInsertRowid });
});

app.get('/api/allocations', authRequired, (req, res) => {
  const rows = db.prepare(`SELECT al.*, a.tag, a.name as asset_name, u.name as employee_name, d.name as department_name
    FROM allocations al
    LEFT JOIN assets a ON a.id = al.asset_id
    LEFT JOIN users u ON u.id = al.employee_id
    LEFT JOIN departments d ON d.id = al.department_id
    ORDER BY al.id DESC`).all();
  res.json(rows);
});

app.post('/api/allocations/:id/return', authRequired, requireRole('Admin', 'Asset Manager'), (req, res) => {
  const { condition_notes } = req.body;
  const alloc = db.prepare('SELECT * FROM allocations WHERE id=?').get(req.params.id);
  if (!alloc) return res.status(404).json({ error: 'Not found' });
  db.prepare(`UPDATE allocations SET status='Returned', returned_date=CURRENT_TIMESTAMP, condition_notes=? WHERE id=?`)
    .run(condition_notes || '', req.params.id);
  db.prepare(`UPDATE assets SET status='Available', current_holder_id=NULL WHERE id=?`).run(alloc.asset_id);
  log(req.user.id, 'Return Asset', `Allocation #${req.params.id} returned`);
  res.json({ message: 'Returned' });
});

// Transfer request - any holder/employee can initiate
app.post('/api/transfers', authRequired, (req, res) => {
  const { asset_id, to_holder_id } = req.body;
  const asset = db.prepare('SELECT * FROM assets WHERE id=?').get(asset_id);
  if (!asset) return res.status(404).json({ error: 'Asset not found' });
  const info = db.prepare(`INSERT INTO transfers (asset_id, from_holder_id, to_holder_id, requested_by, status)
    VALUES (?,?,?,?, 'Requested')`).run(asset_id, asset.current_holder_id, to_holder_id, req.user.id);
  log(req.user.id, 'Transfer Request', `Asset ${asset.tag} -> user ${to_holder_id}`);
  res.json({ id: info.lastInsertRowid });
});

app.get('/api/transfers', authRequired, (req, res) => {
  const rows = db.prepare(`SELECT t.*, a.tag, a.name as asset_name, f.name as from_name, tu.name as to_name
    FROM transfers t LEFT JOIN assets a ON a.id=t.asset_id
    LEFT JOIN users f ON f.id=t.from_holder_id LEFT JOIN users tu ON tu.id=t.to_holder_id
    ORDER BY t.id DESC`).all();
  res.json(rows);
});

app.post('/api/transfers/:id/decision', authRequired, requireRole('Admin', 'Asset Manager', 'Department Head'), (req, res) => {
  const { decision } = req.body; // Approved / Rejected
  const t = db.prepare('SELECT * FROM transfers WHERE id=?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE transfers SET status=?, approved_at=CURRENT_TIMESTAMP, approved_by=? WHERE id=?')
    .run(decision, req.user.id, req.params.id);
  if (decision === 'Approved') {
    db.prepare(`UPDATE assets SET current_holder_id=?, status='Allocated' WHERE id=?`).run(t.to_holder_id, t.asset_id);
    db.prepare(`UPDATE allocations SET status='Returned', returned_date=CURRENT_TIMESTAMP WHERE asset_id=? AND status='Active'`).run(t.asset_id);
    db.prepare(`INSERT INTO allocations (asset_id, employee_id, status) VALUES (?,?, 'Active')`).run(t.asset_id, t.to_holder_id);
    db.prepare(`UPDATE transfers SET status='Re-allocated' WHERE id=?`).run(req.params.id);
    notify(t.to_holder_id, 'Transfer Approved', `Asset transfer approved - asset reassigned to you`);
  } else {
    notify(t.requested_by, 'Transfer Rejected', `Your transfer request was rejected`);
  }
  log(req.user.id, 'Transfer Decision', `#${req.params.id} -> ${decision}`);
  res.json({ message: 'Processed' });
});

/* ---------------- RESOURCE BOOKING ---------------- */

app.get('/api/bookings', authRequired, (req, res) => {
  const { asset_id } = req.query;
  let sql = `SELECT b.*, a.tag, a.name as asset_name, u.name as booked_by_name
             FROM bookings b LEFT JOIN assets a ON a.id=b.asset_id LEFT JOIN users u ON u.id=b.booked_by WHERE 1=1`;
  const params = [];
  if (asset_id) { sql += ' AND b.asset_id=?'; params.push(asset_id); }
  sql += ' ORDER BY b.start_time DESC';
  res.json(db.prepare(sql).all(...params));
});

app.post('/api/bookings', authRequired, (req, res) => {
  const { asset_id, start_time, end_time, purpose } = req.body;
  const asset = db.prepare('SELECT * FROM assets WHERE id=?').get(asset_id);
  if (!asset || !asset.bookable) return res.status(400).json({ error: 'Asset is not bookable' });
  if (new Date(start_time) >= new Date(end_time)) return res.status(400).json({ error: 'Start time must be before end time' });

  // Overlap validation: existing.start < new.end AND existing.end > new.start
  const overlap = db.prepare(`SELECT * FROM bookings WHERE asset_id=? AND status IN ('Upcoming','Ongoing')
      AND start_time < ? AND end_time > ?`).get(asset_id, end_time, start_time);
  if (overlap) {
    return res.status(409).json({ error: `Time slot conflicts with an existing booking (${overlap.start_time} - ${overlap.end_time})` });
  }
  const info = db.prepare(`INSERT INTO bookings (asset_id, booked_by, start_time, end_time, purpose, status)
    VALUES (?,?,?,?,?, 'Upcoming')`).run(asset_id, req.user.id, start_time, end_time, purpose || '');
  notify(req.user.id, 'Booking Confirmed', `Booking for ${asset.name} confirmed: ${start_time} - ${end_time}`);
  log(req.user.id, 'Book Resource', `${asset.tag} ${start_time}-${end_time}`);
  res.json({ id: info.lastInsertRowid });
});

app.post('/api/bookings/:id/cancel', authRequired, (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id=?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Not found' });
  db.prepare(`UPDATE bookings SET status='Cancelled' WHERE id=?`).run(req.params.id);
  notify(booking.booked_by, 'Booking Cancelled', `Your booking #${req.params.id} was cancelled`);
  log(req.user.id, 'Cancel Booking', `#${req.params.id}`);
  res.json({ message: 'Cancelled' });
});

/* ---------------- MAINTENANCE ---------------- */

app.get('/api/maintenance', authRequired, (req, res) => {
  const rows = db.prepare(`SELECT m.*, a.tag, a.name as asset_name, u.name as raised_by_name
    FROM maintenance_requests m LEFT JOIN assets a ON a.id=m.asset_id LEFT JOIN users u ON u.id=m.raised_by
    ORDER BY m.id DESC`).all();
  res.json(rows);
});

app.post('/api/maintenance', authRequired, (req, res) => {
  const { asset_id, issue, priority, photo } = req.body;
  const info = db.prepare(`INSERT INTO maintenance_requests (asset_id, raised_by, issue, priority, photo, status)
    VALUES (?,?,?,?,?, 'Pending')`).run(asset_id, req.user.id, issue, priority || 'Medium', photo || null);
  log(req.user.id, 'Raise Maintenance', `Asset #${asset_id}: ${issue}`);
  res.json({ id: info.lastInsertRowid });
});

app.post('/api/maintenance/:id/decision', authRequired, requireRole('Admin', 'Asset Manager'), (req, res) => {
  const { decision } = req.body; // Approved / Rejected
  const m = db.prepare('SELECT * FROM maintenance_requests WHERE id=?').get(req.params.id);
  if (!m) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE maintenance_requests SET status=?, approved_by=? WHERE id=?').run(decision, req.user.id, req.params.id);
  if (decision === 'Approved') {
    db.prepare(`UPDATE assets SET status='Under Maintenance' WHERE id=?`).run(m.asset_id);
  }
  notify(m.raised_by, `Maintenance ${decision}`, `Your maintenance request #${req.params.id} was ${decision.toLowerCase()}`);
  log(req.user.id, 'Maintenance Decision', `#${req.params.id} -> ${decision}`);
  res.json({ message: 'Processed' });
});

app.post('/api/maintenance/:id/assign-technician', authRequired, requireRole('Admin', 'Asset Manager'), (req, res) => {
  const { technician } = req.body;
  db.prepare(`UPDATE maintenance_requests SET status='Technician Assigned', technician=? WHERE id=?`).run(technician, req.params.id);
  res.json({ message: 'Assigned' });
});

app.post('/api/maintenance/:id/progress', authRequired, requireRole('Admin', 'Asset Manager'), (req, res) => {
  db.prepare(`UPDATE maintenance_requests SET status='In Progress' WHERE id=?`).run(req.params.id);
  res.json({ message: 'In Progress' });
});

app.post('/api/maintenance/:id/resolve', authRequired, requireRole('Admin', 'Asset Manager'), (req, res) => {
  const m = db.prepare('SELECT * FROM maintenance_requests WHERE id=?').get(req.params.id);
  db.prepare(`UPDATE maintenance_requests SET status='Resolved', resolved_at=CURRENT_TIMESTAMP WHERE id=?`).run(req.params.id);
  db.prepare(`UPDATE assets SET status='Available' WHERE id=?`).run(m.asset_id);
  notify(m.raised_by, 'Maintenance Resolved', `Maintenance request #${req.params.id} resolved. Asset is available again.`);
  log(req.user.id, 'Resolve Maintenance', `#${req.params.id}`);
  res.json({ message: 'Resolved' });
});

/* ---------------- AUDITS ---------------- */

app.get('/api/audits', authRequired, (req, res) => {
  const cycles = db.prepare(`SELECT ac.*, d.name as department_name FROM audit_cycles ac
    LEFT JOIN departments d ON d.id = ac.scope_department_id ORDER BY ac.id DESC`).all();
  const withDetails = cycles.map(c => {
    const auditors = db.prepare(`SELECT u.id, u.name FROM audit_assignments aa JOIN users u ON u.id=aa.auditor_id WHERE aa.cycle_id=?`).all(c.id);
    const items = db.prepare(`SELECT ai.*, a.tag, a.name as asset_name FROM audit_items ai JOIN assets a ON a.id=ai.asset_id WHERE ai.cycle_id=?`).all(c.id);
    return { ...c, auditors, items };
  });
  res.json(withDetails);
});

app.post('/api/audits', authRequired, requireRole('Admin'), (req, res) => {
  const { name, scope_department_id, location, start_date, end_date, auditor_ids, asset_ids } = req.body;
  const info = db.prepare(`INSERT INTO audit_cycles (name, scope_department_id, location, start_date, end_date, status)
    VALUES (?,?,?,?,?, 'Open')`).run(name, scope_department_id || null, location || null, start_date, end_date);
  const cycleId = info.lastInsertRowid;
  (auditor_ids || []).forEach(aid => {
    db.prepare('INSERT INTO audit_assignments (cycle_id, auditor_id) VALUES (?,?)').run(cycleId, aid);
    notify(aid, 'Audit Assigned', `You have been assigned to audit cycle "${name}"`);
  });
  let assets = asset_ids;
  if (!assets || !assets.length) {
    let sql = 'SELECT id FROM assets WHERE 1=1';
    const params = [];
    if (scope_department_id) { sql += ' AND department_id=?'; params.push(scope_department_id); }
    if (location) { sql += ' AND location LIKE ?'; params.push(`%${location}%`); }
    assets = db.prepare(sql).all(...params).map(a => a.id);
  }
  assets.forEach(aid => {
    db.prepare('INSERT INTO audit_items (cycle_id, asset_id, result) VALUES (?,?, \'Pending\')').run(cycleId, aid);
  });
  log(req.user.id, 'Create Audit Cycle', name);
  res.json({ id: cycleId });
});

app.post('/api/audits/items/:itemId/mark', authRequired, (req, res) => {
  const { result, notes } = req.body; // Verified / Missing / Damaged
  db.prepare('UPDATE audit_items SET result=?, notes=? WHERE id=?').run(result, notes || '', req.params.itemId);
  res.json({ message: 'Marked' });
});

app.post('/api/audits/:id/close', authRequired, requireRole('Admin'), (req, res) => {
  const items = db.prepare('SELECT * FROM audit_items WHERE cycle_id=?').all(req.params.id);
  items.forEach(it => {
    if (it.result === 'Missing') db.prepare(`UPDATE assets SET status='Lost' WHERE id=?`).run(it.asset_id);
    if (it.result === 'Damaged') db.prepare(`UPDATE assets SET condition='Damaged' WHERE id=?`).run(it.asset_id);
  });
  db.prepare(`UPDATE audit_cycles SET status='Closed' WHERE id=?`).run(req.params.id);
  const discrepancies = items.filter(i => i.result === 'Missing' || i.result === 'Damaged');
  log(req.user.id, 'Close Audit', `Cycle #${req.params.id}, ${discrepancies.length} discrepancies`);
  res.json({ message: 'Closed', discrepancy_count: discrepancies.length });
});

/* ---------------- NOTIFICATIONS & LOGS ---------------- */

app.get('/api/notifications', authRequired, (req, res) => {
  res.json(db.prepare('SELECT * FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT 50').all(req.user.id));
});

app.post('/api/notifications/:id/read', authRequired, (req, res) => {
  db.prepare('UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?').run(req.params.id, req.user.id);
  res.json({ message: 'Read' });
});

app.get('/api/logs', authRequired, requireRole('Admin', 'Asset Manager', 'Department Head'), (req, res) => {
  res.json(db.prepare(`SELECT l.*, u.name as user_name FROM activity_logs l LEFT JOIN users u ON u.id=l.user_id
    ORDER BY l.id DESC LIMIT 200`).all());
});

/* ---------------- DASHBOARD / KPIs ---------------- */

app.get('/api/dashboard', authRequired, (req, res) => {
  const count = (sql, ...p) => db.prepare(sql).get(...p).c;
  const kpis = {
    assets_available: count("SELECT COUNT(*) c FROM assets WHERE status='Available'"),
    assets_allocated: count("SELECT COUNT(*) c FROM assets WHERE status='Allocated'"),
    maintenance_today: count("SELECT COUNT(*) c FROM maintenance_requests WHERE date(created_at)=date('now') OR status IN ('Approved','Technician Assigned','In Progress')"),
    active_bookings: count("SELECT COUNT(*) c FROM bookings WHERE status IN ('Upcoming','Ongoing')"),
    pending_transfers: count("SELECT COUNT(*) c FROM transfers WHERE status='Requested'"),
    upcoming_returns: count("SELECT COUNT(*) c FROM allocations WHERE status='Active' AND expected_return_date >= date('now')")
  };
  const overdueAllocations = db.prepare(`SELECT al.*, a.tag, a.name as asset_name, u.name as employee_name
    FROM allocations al LEFT JOIN assets a ON a.id=al.asset_id LEFT JOIN users u ON u.id=al.employee_id
    WHERE al.status='Active' AND al.expected_return_date < date('now')`).all();
  const overdueBookings = db.prepare(`SELECT b.*, a.name as asset_name FROM bookings b LEFT JOIN assets a ON a.id=b.asset_id
    WHERE b.status='Upcoming' AND b.end_time < datetime('now')`).all();
  const upcomingReturns = db.prepare(`SELECT al.*, a.tag, a.name as asset_name, u.name as employee_name
    FROM allocations al LEFT JOIN assets a ON a.id=al.asset_id LEFT JOIN users u ON u.id=al.employee_id
    WHERE al.status='Active' AND al.expected_return_date >= date('now') ORDER BY al.expected_return_date ASC LIMIT 10`).all();
  res.json({ kpis, overdueAllocations, overdueBookings, upcomingReturns });
});

/* ---------------- REPORTS ---------------- */

app.get('/api/reports/summary', authRequired, (req, res) => {
  const byStatus = db.prepare(`SELECT status, COUNT(*) c FROM assets GROUP BY status`).all();
  const byCategory = db.prepare(`SELECT c.name, COUNT(a.id) c_count FROM categories c LEFT JOIN assets a ON a.category_id=c.id GROUP BY c.id`).all();
  const maintenanceByCategory = db.prepare(`SELECT c.name, COUNT(m.id) m_count FROM categories c
    LEFT JOIN assets a ON a.category_id=c.id LEFT JOIN maintenance_requests m ON m.asset_id=a.id GROUP BY c.id`).all();
  const departmentAllocation = db.prepare(`SELECT d.name, COUNT(al.id) alloc_count FROM departments d
    LEFT JOIN allocations al ON al.department_id=d.id AND al.status='Active' GROUP BY d.id`).all();
  const nearingRetirement = db.prepare(`SELECT tag, name, acquisition_date FROM assets
    WHERE acquisition_date IS NOT NULL AND date(acquisition_date) < date('now','-5 years')`).all();
  const bookingHeatmap = db.prepare(`SELECT strftime('%H', start_time) as hour, COUNT(*) c FROM bookings GROUP BY hour ORDER BY hour`).all();
  res.json({ byStatus, byCategory, maintenanceByCategory, departmentAllocation, nearingRetirement, bookingHeatmap });
});

/* ---------------- AI ASSISTANT ---------------- */

app.post('/api/assistant/chat', authRequired, async (req, res) => {
  const { message, history } = req.body;
  if (!message || !String(message).trim()) return res.status(400).json({ error: 'Message is required' });
  try {
    const result = await getAssistantReply({ user: req.user, message: String(message).trim(), history });
    res.json(result);
  } catch (err) {
    console.error('[assistant] error:', err.message);
    res.status(500).json({ error: 'Assistant is unavailable right now' });
  }
});

/* ---------------- START ---------------- */

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`AssetFlow API running on port ${PORT}`));
