# M365 Analytics Platform - PRD

## Project Overview
**Date Started:** Feb 2026  
**Status:** MVP Complete  
**Type:** SaaS Admin Dashboard  

## Original Problem Statement
Build an AdminDroid-like Microsoft 365 Analytics & Reporting Platform — a multi-tenant SaaS dashboard enabling IT admins to monitor M365 usage, security, performance, generate pre-built reports, detect anomalies, and manage compliance.

## User Personas
- M365 Administrators (Global Admin, Exchange Admin)
- Security & Compliance Teams
- IT Managers / CIO Office
- MSPs managing multiple tenants

## Architecture

### Tech Stack
- **Frontend:** React (CRA + CRACO), React Router v7, Recharts, Tailwind CSS, Shadcn/UI, next-themes
- **Backend:** FastAPI (Python), JWT Auth (python-jose + bcrypt), Motor (async MongoDB)
- **Database:** MongoDB
- **Design:** Tech Blue (#2563EB) primary, Manrope + IBM Plex Sans fonts, Dark/Light mode

### Project Structure
```
/app/
├── backend/
│   ├── server.py         # All API endpoints
│   └── .env              # MONGO_URL, DB_NAME, SECRET_KEY
└── frontend/src/
    ├── App.js            # Root routing + providers
    ├── context/AuthContext.js
    ├── components/
    │   ├── Layout.jsx    # Main layout
    │   ├── Sidebar.jsx   # Collapsible nav
    │   └── Topbar.jsx    # Header bar
    └── pages/
        ├── Login.jsx
        ├── Dashboard.jsx
        ├── Alerts.jsx
        ├── Settings.jsx
        ├── exchange/     # 4 report pages
        └── entra/        # 4 report pages
```

## What's Been Implemented (MVP - Feb 2026)

## What's Been Implemented (MVP - Feb 2026)

### Phase 1 - Core Modules (Feb 2026)
1. **Executive Dashboard** - KPIs, Health Score, Secure Score, Charts, Recent Alerts
2. **Exchange Online** - Mailbox Usage, Inactive Mailboxes, Mail Traffic, Forwarding Rules
3. **Entra ID** - Sign-in Logs, Risky Users, MFA Status, Conditional Access Policies
4. **Alerts Page** - With severity/category filtering
5. **Settings Page** - Theme toggle, profile, notifications
6. **JWT Auth** - Register + Login with bcrypt

### Phase 2 - Multi-Tenant Management (Feb 2026)
7. **Tenant Management Page** (`/tenants`)
   - Add/Edit/Delete tenants (Demo or Real mode)
   - Test Connection for real tenants (verifies Azure credentials)
   - Sync data from real tenants (stores in MongoDB cache)
   - Switch between tenants
8. **Tenant Switcher** in Topbar dropdown
9. **TenantContext** - Global axios interceptor auto-injects tenantId
10. **Microsoft Graph API Integration** (`graph_service.py`)
    - OAuth 2.0 client credentials flow with token caching
    - Sign-in logs, Risky users, MFA status, CA policies, Dashboard overview, Mailbox usage
    - Automatic fallback to mock data if Graph API fails
11. **Secret Encryption** - Client secrets encrypted with Fernet (SHA256 derived key)

## Core Requirements (Static)
- Must support enterprise security standards
- Must be mobile-responsive
- Must have dark/light mode toggle
- All API routes prefixed with /api
- JWT stored in localStorage

## Prioritized Backlog

### P0 - Next Phase
- [ ] Real Microsoft Graph API integration (OAuth 2.0)
- [ ] SharePoint Online reports module
- [ ] OneDrive reports module
- [ ] Teams analytics module

### P1 - High Priority
- [ ] Report scheduling (daily/weekly/monthly)
- [ ] Email delivery of reports
- [ ] Excel/PDF export formats
- [ ] Multi-tenant management (MSP view)
- [ ] Threshold-based alert configuration
- [ ] Custom report builder

### P2 - Enhancements
- [ ] AI-powered insights ("Top 10 inactive users")
- [ ] Natural language query
- [ ] Power BI integration
- [ ] RBAC implementation
- [ ] Audit logs for platform usage
- [ ] Webhook/API push for alerts

## Test Credentials
- Email: admin@contoso.com
- Password: Admin123!

## API Endpoints
All routes require Bearer JWT token (except auth):
- POST /api/auth/register
- POST /api/auth/login
- GET /api/dashboard/overview
- GET /api/exchange/mailbox-usage
- GET /api/exchange/inactive-mailboxes
- GET /api/exchange/mail-traffic
- GET /api/exchange/forwarding-rules
- GET /api/entra/signin-logs
- GET /api/entra/risky-users
- GET /api/entra/mfa-status
- GET /api/entra/conditional-access
- GET /api/alerts
