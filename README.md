
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
# 🚀 AssetFlow Enterprise

AssetFlow Enterprise is a smart digital asset management platform developed to simplify the registration, tracking, allocation, maintenance, and monitoring of organizational assets. The system provides a centralized dashboard where administrators can efficiently manage assets while maintaining complete records and improving operational efficiency.

---

# 📌 Project Overview

Organizations often face challenges in maintaining accurate records of their physical assets. AssetFlow Enterprise provides a modern web-based solution that enables users to manage assets digitally with secure authentication, real-time updates, and an easy-to-use interface.

The application is built using a three-tier architecture consisting of:

- Frontend
- Backend
- Database

---

# ✨ Features

- User Authentication (Login & Signup)
- Asset Registration
- Asset Tracking
- Asset Allocation Management
- Dashboard Overview
- Notification Support
- AI Assistant Integration
- Secure Backend APIs
- Database Management using SQLite
- Responsive User Interface

---

# 🛠 Technology Stack

## Frontend
- HTML5
- CSS3
- JavaScript

## Backend
- Node.js
- Express.js

## Database
- SQLite

---

# 📁 Project Structure

```
AssetFlow/
│
├── frontend/
│   ├── app.html
│   ├── login.html
│   ├── signup.html
│   ├── css/
│   └── js/
│
├── backend/
│   ├── server.js
│   ├── db.js
│   ├── assistant.js
│   ├── utils.js
│   ├── seed.js
│   ├── package.json
│   └── package-lock.json
│
├── database/
│   ├── assetflow.db
│   ├── schema.sql
│   ├── full_dump.sql
│   └── ER-diagram.md
│
└── README.md
```

---

# ⚙ Installation Guide

## Step 1

Clone the repository

```bash
git clone https://github.com/manavlavingiya2006/AssetFlowEnterprise-.git
```

## Step 2

Navigate to backend

```bash
cd AssetFlow/backend
```

## Step 3

Install dependencies

```bash
npm install
```

## Step 4

Run the backend server

```bash
npm start
```

or

```bash
node server.js
```

## Step 5

Open the frontend by launching:

- login.html
- signup.html
- app.html

using a browser or Live Server extension in Visual Studio Code.

---

# 🗄 Database

The project uses **SQLite** as its database.

Database files included:

- assetflow.db
- schema.sql
- full_dump.sql
- ER-diagram.md

---

# 👨‍💻 Team Contributions

## 🎨 Frontend Development
**Manav Lavingiya**

Responsible for:

- UI/UX Design
- HTML Pages
- CSS Styling
- JavaScript Frontend Functionality
- Responsive User Interface

---

## ⚙ Backend Development
**Vaibhav Shah**

Responsible for:

- Node.js Server
- Express.js APIs
- Backend Logic
- AI Assistant Integration
- Database Connectivity
- Utility Functions

---

## 🗄 Database Development
**Rutva Patel**

Responsible for:

- Database Design
- SQLite Database
- Schema Design
- SQL Scripts
- ER Diagram
- Database Documentation

---

# 👥 Team Members

| Name | Role |
|------|------|
| Manav Lavingiya | Frontend Developer |
| Vaibhav Shah | Backend Developer |
| Rutva Patel | Database Developer |

---

# 🎯 Project Objective

The primary objective of AssetFlow Enterprise is to provide a centralized, secure, and efficient platform for managing organizational assets digitally while reducing manual efforts, improving accuracy, and increasing productivity.

---

# 🔮 Future Enhancements

- Cloud Database Integration
- QR Code Based Asset Tracking
- Barcode Scanner Support
- Asset Analytics Dashboard
- Mobile Application
- Email Notifications
- Multi-role Authentication
- AI-based Asset Recommendations

---

# 📜 License

This project has been developed solely for educational and hackathon purposes.

---

# ❤️ Acknowledgement

We sincerely thank our mentors, faculty members, teammates, and the hackathon organizers for their continuous guidance, encouragement, and support throughout the development of this project.

---

## ⭐ Developed By

**AssetFlow Enterprise Team**

- **Manav Lavingiya** – Frontend Development
- **Vaibhav Shah** – Backend Development
- **Rutva Patel** – Database Development

