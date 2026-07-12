# AssetFlow — Entity Relationship Diagram

```mermaid
erDiagram
    DEPARTMENTS ||--o{ USERS : "employs"
    DEPARTMENTS ||--o{ ASSETS : "owns"
    DEPARTMENTS ||--o{ ALLOCATIONS : "scopes"
    DEPARTMENTS ||--o{ AUDIT_CYCLES : "scopes"

    CATEGORIES ||--o{ ASSETS : "classifies"

    USERS ||--o{ ASSETS : "currently holds"
    USERS ||--o{ ALLOCATIONS : "employee"
    USERS ||--o{ TRANSFERS : "from / to / requested_by / approved_by"
    USERS ||--o{ BOOKINGS : "booked_by"
    USERS ||--o{ MAINTENANCE_REQUESTS : "raised_by / approved_by"
    USERS ||--o{ AUDIT_ASSIGNMENTS : "auditor"
    USERS ||--o{ NOTIFICATIONS : "recipient"
    USERS ||--o{ ACTIVITY_LOGS : "actor"

    ASSETS ||--o{ ALLOCATIONS : "has history"
    ASSETS ||--o{ TRANSFERS : "moved via"
    ASSETS ||--o{ BOOKINGS : "booked as"
    ASSETS ||--o{ MAINTENANCE_REQUESTS : "raised for"
    ASSETS ||--o{ AUDIT_ITEMS : "checked in"

    AUDIT_CYCLES ||--o{ AUDIT_ASSIGNMENTS : "has auditors"
    AUDIT_CYCLES ||--o{ AUDIT_ITEMS : "contains"

    DEPARTMENTS {
        int id PK
        string name
        int head_id FK
        int parent_id FK
        string status
    }
    CATEGORIES {
        int id PK
        string name
        string extra_fields
    }
    USERS {
        int id PK
        string name
        string email
        string password
        string role
        int department_id FK
        string status
    }
    ASSETS {
        int id PK
        string tag
        string name
        int category_id FK
        string serial_number
        real acquisition_cost
        string condition
        string location
        int department_id FK
        int bookable
        string status
        int current_holder_id FK
    }
    ALLOCATIONS {
        int id PK
        int asset_id FK
        int employee_id FK
        int department_id FK
        string status
    }
    TRANSFERS {
        int id PK
        int asset_id FK
        int from_holder_id FK
        int to_holder_id FK
        int requested_by FK
        string status
    }
    BOOKINGS {
        int id PK
        int asset_id FK
        int booked_by FK
        string start_time
        string end_time
        string status
    }
    MAINTENANCE_REQUESTS {
        int id PK
        int asset_id FK
        int raised_by FK
        string priority
        string status
    }
    AUDIT_CYCLES {
        int id PK
        string name
        int scope_department_id FK
        string status
    }
    AUDIT_ASSIGNMENTS {
        int id PK
        int cycle_id FK
        int auditor_id FK
    }
    AUDIT_ITEMS {
        int id PK
        int cycle_id FK
        int asset_id FK
        string result
    }
    NOTIFICATIONS {
        int id PK
        int user_id FK
        string type
        int is_read
    }
    ACTIVITY_LOGS {
        int id PK
        int user_id FK
        string action
    }
```

Paste the block above into [mermaid.live](https://mermaid.live) or any Markdown viewer with Mermaid support (GitHub renders it natively) to view it visually.
