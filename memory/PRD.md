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

### Modules Active
1. **Executive Dashboard**
   - Tenant health score (87/100 ring chart)
   - 4 KPI cards: Total Users, Licensed Users, Storage, Active Alerts
   - Secure Score card with breakdown
   - License utilization bars
   - Storage trends (Area chart - 6 months)
   - User activity chart (Bar chart - 7 days)
   - Recent alerts list

2. **Exchange Online Reports**
   - Mailbox Usage (table + storage progress bars + pagination)
   - Inactive Mailboxes (with risk classification: High/Medium/Low)
   - Mail Traffic (multi-line chart for sent/received/spam/malware)
   - Forwarding Rules (with critical risk alert banners)

3. **Entra ID Reports**
   - Sign-in Logs (with status/risk filtering)
   - Risky Users (with compromised user alerts)
   - MFA Status (pie chart + user table with state filter)
   - Conditional Access Policies (policy table)

4. **Alerts Page** (7 active mock alerts with severity/category filtering)

5. **Settings Page** (theme toggle, profile info, notifications, platform info)

### Features
- JWT-based auth (register + login)
- Collapsible sidebar navigation
- Dark/Light/System mode toggle
- Search + filtering on all report pages
- Export CSV on all report pages
- Pagination on Mailbox Usage
- Responsive layout

### Data Mode
- **MOCKED** - All M365 data is realistic simulated data
- No real Microsoft Graph API connection

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
