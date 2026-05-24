# Edel Admin Blueprint
> Version: MVP Launch Blueprint v0.1  
> Status: Proposed implementation guide  
> Scope: Simple, launch-ready admin system for Edel  
> Audience: Coding agents and engineers implementing the admin system

---

## 1. Purpose

This document defines the **minimum viable admin system** required to operate Edel safely at launch.

The admin system must be:

- simple enough to build quickly
- strict enough to control abuse and platform quality
- practical for a low-volume launch team
- based on the platform that already exists today

This is **not** a full enterprise back-office. It is a lean operational console for early-stage launch.

---

## 2. Admin Philosophy

At launch, the admin system should prioritize only the jobs that are truly necessary:

- know who is on the platform
- know what orders are happening
- see customer reports quickly
- resolve obvious disputes manually
- stop bad actors
- adjust a few core platform settings

Anything more advanced should wait until usage justifies the complexity.

---

## 3. What Exists Today

The current platform already supports the following core business objects:

- `User`
  - roles: `customer`, `provider`, `both`, `admin`
  - profile, rating, tier, availability, location
- `Service`
  - provider-owned services
- `Order`
  - lifecycle: `pending`, `accepted`, `in_progress`, `declined`, `cancelled`, `completed`
  - includes cancellation reason and customer report fields
- `Session`
  - temporary verification session for QR start flow
- `Verification`
  - proof that provider and customer were physically near each other

Important launch reality:

- customer-to-provider payment is still off-platform
- provider access-fee flow is described in blueprint but not yet fully implemented
- reports currently live on the `Order` record as `reportMessage` and `reportedAt`
- there is already an `admin` user role in the `User` model

This admin blueprint is designed around those facts.

---

## 4. Launch Goals

The launch admin system must allow an admin to do the following:

1. View high-level platform health.
2. Search and inspect users.
3. Search and inspect orders.
4. Review customer reports against providers.
5. Review verification history for suspicious jobs.
6. Suspend or restore problematic accounts.
7. Disable or remove problematic services.
8. Adjust a few core platform-wide settings without code edits.
9. Leave an internal resolution note for important cases.

If a feature does not support one of those goals, it should probably not be in MVP.

---

## 5. Admin Role Model

### 5.1 Launch Permission Model

Use a **single admin role** only.

- No multi-role admin RBAC at launch.
- No moderator vs support vs finance split yet.
- Any user with `role = admin` gets full admin access.

This keeps implementation fast and removes permission complexity.

### 5.2 Access Rule

Admin pages and admin APIs must be accessible only when:

- user is authenticated
- user role is `admin`

Non-admin users must be blocked both:

- at the route/UI level
- at the backend API level

---

## 6. MVP Admin Modules

The admin system should ship with only **five primary modules**.

### 6.1 Dashboard

Purpose: quick platform pulse.

Must show:

- total users
- total customers
- total providers
- total completed orders
- total active orders
- total reported orders awaiting review
- total suspended users
- recent signups
- recent reports

This page is not for deep work. It is a summary page only.

### 6.2 Users

Purpose: manage platform members.

Must support:

- list users
- filter by role
- filter by account status
- search by name, email, phone number
- open user detail view
- suspend user
- restore user
- promote user to admin manually if needed

Must show in the detail view:

- basic identity
- role
- location label
- rating
- tier
- jobs completed
- availability status
- signup date
- services owned
- recent orders as customer
- recent orders as provider
- current account state

### 6.3 Orders

Purpose: inspect operational activity and disputes.

Must support:

- list orders
- filter by status
- filter by date
- search by order ID, customer name, provider name, service title
- open order detail view
- manually mark a case as reviewed

Must show in the detail view:

- customer
- provider
- service title/category
- base price
- timestamps across the lifecycle
- customer location label
- cancellation reason if any
- report message if any
- verification session outcome if one exists

### 6.4 Reports

Purpose: resolve customer complaints quickly.

At launch, a “report” can remain tied to the order rather than becoming a separate complex case-management system.

Must support:

- list only orders that have `reportMessage` and `reportedAt`
- filter by unresolved/resolved
- open report detail
- assign simple resolution status
- write internal admin note
- apply admin action from the report screen

Admin actions from a report:

- no action
- warn provider
- suspend provider
- suspend customer
- disable related service

### 6.5 Settings

Purpose: hold a very small set of editable platform controls.

Only the following launch settings should exist:

- provider rating increase per successful job
- provider rating decrease per report
- customer rating decrease per complaint
- provider access fee amount
- free completed-order count before access fee
- verification max distance meters
- verification max accuracy meters

Anything more advanced should remain hardcoded until truly needed.

---

## 7. Features Explicitly Out of Scope for MVP

Do **not** build these in the first admin release:

- complex role-based admin permissions
- advanced audit analytics
- refunds ledger
- payout management
- full ticketing/helpdesk workflow
- automated fraud scoring
- bulk CSV import/export
- complex approval workflow for every provider
- live map operations center
- notification campaign manager
- admin chat system

These can come later.

---

## 8. Recommended Launch Information Architecture

The admin UI should use a very simple layout:

- left sidebar
  - Dashboard
  - Users
  - Orders
  - Reports
  - Settings
- top bar
  - search
  - current admin identity
  - logout

Each module should use the same interaction model:

- summary cards at top when useful
- filters
- table/list
- side panel or detail page for deeper inspection

Avoid over-designed admin UX. It should feel clean, readable, and operational.

---

## 9. Launch Data Model Additions

The current schema is close, but a few small additions are needed for a usable admin system.

### 9.1 Add User Account State

Add fields to `User`:

- `accountStatus`
  - enum: `active`, `suspended`
  - default: `active`
- `suspensionReason`
  - text, nullable
- `suspendedAt`
  - datetime, nullable

Reason:

- launch admin must be able to block abusive users cleanly

### 9.2 Add Service State

Add fields to `Service`:

- `serviceStatus`
  - enum: `active`, `disabled`
  - default: `active`
- `disabledReason`
  - text, nullable
- `disabledAt`
  - datetime, nullable

Reason:

- admin needs to disable a problematic listing without deleting the provider account

### 9.3 Add Admin Review Fields to Orders

Because reports currently live on `Order`, add lightweight review metadata there:

- `reportStatus`
  - enum: `open`, `reviewed`, `resolved`
  - nullable or default `open` only when report exists
- `reportResolution`
  - short text or enum, nullable
- `adminNote`
  - text, nullable
- `reviewedByAdminId`
  - user id, nullable
- `reviewedAt`
  - datetime, nullable

Reason:

- this avoids creating a separate disputes table too early

### 9.4 Add Platform Settings Table

Create a small `PlatformSetting` table or equivalent key-value storage.

Required settings:

- `provider_rating_increment`
- `provider_report_penalty`
- `customer_complaint_penalty`
- `provider_access_fee_amount`
- `provider_free_order_limit`
- `verification_max_distance_meters`
- `verification_max_accuracy_meters`

Reason:

- product blueprint already expects some of these values to be admin-controlled

### 9.5 Optional but Strongly Recommended: Admin Action Log

Create a minimal `AdminActionLog` table.

Fields:

- `id`
- `adminUserId`
- `targetType`
  - `user`, `service`, `order`, `setting`
- `targetId`
- `actionType`
  - e.g. `suspend_user`, `restore_user`, `disable_service`, `resolve_report`, `update_setting`
- `reason`
- `metadataJson`
- `createdAt`

Reason:

- even at launch, admin actions should be traceable

This is small and high-value.

---

## 10. Core Admin Workflows

### 10.1 Review a Customer Report

Flow:

1. Admin opens Reports.
2. Admin sees all orders with a customer report.
3. Admin opens one case.
4. Admin reviews:
   - customer
   - provider
   - service
   - timestamps
   - report text
   - verification data if any
5. Admin chooses a resolution:
   - no action
   - warn provider
   - suspend provider
   - suspend customer
   - disable service
6. Admin writes internal note.
7. Case moves to `resolved`.

### 10.2 Suspend a User

Flow:

1. Admin opens Users.
2. Admin searches for user.
3. Admin opens detail view.
4. Admin clicks Suspend.
5. Admin enters reason.
6. Backend sets:
   - `accountStatus = suspended`
   - `suspensionReason`
   - `suspendedAt`
7. Suspended user can no longer log in or use protected APIs.

### 10.3 Restore a User

Flow:

1. Admin opens suspended user.
2. Admin clicks Restore.
3. Backend resets:
   - `accountStatus = active`
   - clears suspension metadata
4. User regains access immediately.

### 10.4 Disable a Service

Flow:

1. Admin opens provider detail or service detail.
2. Admin clicks Disable Service.
3. Admin enters reason.
4. Backend sets:
   - `serviceStatus = disabled`
   - `disabledReason`
   - `disabledAt`
5. Disabled service no longer appears in discovery.

### 10.5 Review Verification Anomaly

Launch anomalies to surface:

- order reported by customer
- verification missing on an order that reached `in_progress`
- verification distance unusually close to threshold

Admin does not need a separate fraud console yet. This can appear in order detail as a verification section plus warning badges.

---

## 11. Dashboard Definition

The dashboard should stay compact.

### 11.1 KPI Cards

Use these cards:

- Total Users
- Providers
- Customers
- Active Orders
- Completed Orders
- Open Reports
- Suspended Users

### 11.2 Recent Activity Panels

Use three simple panels:

- Recent Signups
- Recent Orders
- Recent Reports

No charts are required for MVP.

If one chart is added, keep it to:

- orders by status

But even that is optional.

---

## 12. Users Module Definition

### 12.1 User List Columns

Recommended columns:

- User ID
- Name
- Email
- Phone
- Role
- Rating
- Tier
- Account Status
- Availability
- Created At

### 12.2 User Filters

Required filters:

- role
- account status
- availability
- date joined

### 12.3 User Actions

Allowed actions:

- view detail
- suspend
- restore
- promote to admin

Not allowed in MVP:

- impersonate user
- edit password
- manual role downgrade flows

---

## 13. Orders Module Definition

### 13.1 Order List Columns

Recommended columns:

- Order ID
- Customer
- Provider
- Service
- Status
- Reported?
- Created At
- Last Updated At

### 13.2 Order Filters

Required filters:

- status
- reported only
- date range
- provider
- customer

### 13.3 Order Detail Sections

Order detail page/panel should show:

- order summary
- lifecycle timestamps
- participant details
- location details
- report details
- cancellation details
- verification details
- admin note and resolution block

---

## 14. Reports Module Definition

At launch, reports should be treated as **reported orders**, not a new standalone support product.

### 14.1 Report List Columns

- Order ID
- Reported At
- Customer
- Provider
- Service
- Report Status

### 14.2 Report Filters

- open
- reviewed
- resolved
- date range

### 14.3 Report Resolution Values

Use a fixed set:

- `no_action`
- `warning_issued`
- `provider_suspended`
- `customer_suspended`
- `service_disabled`

This is enough for launch.

---

## 15. Settings Module Definition

Settings should be grouped into two sections only.

### 15.1 Ratings

- provider rating increase on successful completion
- provider rating decrease on customer report
- customer rating decrease on provider complaint

### 15.2 Operations

- provider access fee amount
- free order count before fee
- verification max distance
- verification max GPS accuracy

Each setting should have:

- current value
- short description
- save button
- last updated timestamp

Do not build version history UI yet.

---

## 16. Backend Requirements

The admin system needs a dedicated admin route group.

Recommended route prefix:

- `/api/admin/...`

### 16.1 Required Admin Endpoints

Minimum endpoint groups:

- `GET /api/admin/dashboard`
- `GET /api/admin/users`
- `GET /api/admin/users/:id`
- `POST /api/admin/users/:id/suspend`
- `POST /api/admin/users/:id/restore`
- `POST /api/admin/users/:id/make-admin`
- `GET /api/admin/orders`
- `GET /api/admin/orders/:id`
- `GET /api/admin/reports`
- `GET /api/admin/reports/:orderId`
- `POST /api/admin/reports/:orderId/review`
- `POST /api/admin/services/:id/disable`
- `POST /api/admin/services/:id/restore`
- `GET /api/admin/settings`
- `PUT /api/admin/settings`

### 16.2 Access Middleware

Create a dedicated admin authorization middleware.

Logic:

- require authenticated user
- require `req.user.role === 'admin'`

### 16.3 Enforcement Rule

Suspended users should be blocked globally from normal protected APIs.

That means the normal auth middleware should eventually also check:

- if authenticated user exists
- if `accountStatus !== suspended`

Admin accounts should still be blocked too if suspended.

---

## 17. Frontend Requirements

The admin UI should be a separate app section under:

- `/admin/`

### 17.1 Launch Pages

Only these screens are needed:

- admin dashboard
- user list
- user detail
- order list
- order detail
- reports list
- report detail
- settings

If implementation prefers a single-page admin shell with tabs, that is acceptable.

### 17.2 Launch UX Rules

- always show status badges clearly
- make destructive actions require confirmation
- show success/error feedback for every admin action
- show empty states clearly
- support mobile, but optimize primarily for desktop operations

---

## 18. Recommended Launch Metrics

These are the only operational counts that matter at launch:

- user growth
- provider count
- active orders
- completed orders
- report volume
- suspended accounts

Do not attempt deeper BI or revenue analytics yet.

---

## 19. Operational Rules

### 19.1 Reports

- every customer report must be visible to admin
- open reports should be easy to filter first
- a report is considered unresolved until an admin explicitly marks it resolved

### 19.2 Suspensions

- a suspended user must not continue normal platform activity
- suspension should be reversible
- admin must leave a reason

### 19.3 Service Visibility

- disabled services must not appear in discovery
- provider account may remain active while one service is disabled

### 19.4 Manual Resolution

At launch, human admin judgment is acceptable.

Do not over-automate dispute logic yet.

---

## 20. Future Expansion Path

This launch blueprint should evolve later into:

- separate disputes table
- warning system
- provider verification/approval workflow
- payments and provider access-fee ledger
- better analytics
- richer admin roles and permissions
- full audit history UI
- customer complaint handling beyond order scope

But none of those are required now.

---

## 21. Implementation Priority

Recommended build order:

1. Admin auth guard and admin-only middleware
2. Admin dashboard summary endpoint
3. Users list/detail/suspend/restore
4. Orders list/detail
5. Reports list/detail/review
6. Service disable/restore actions
7. Settings store and settings page
8. Optional admin action log

This order gives immediate operational control fastest.

---

## 22. Final MVP Definition

The admin system is complete for launch when an admin can:

- log into `/admin/`
- see platform summary
- search any user
- inspect any active or past order
- review customer reports
- suspend bad users
- disable bad services
- mark reports resolved
- edit a few global settings

If all of the above works reliably, the admin system is sufficient for launch.

---

## 23. Notes for Coding Agents

When implementing this blueprint:

- prefer extending current models instead of creating many new systems
- keep reports tied to orders for MVP
- avoid introducing complex workflows
- build admin endpoints separately from user endpoints
- keep all admin actions explicit and reversible where possible
- favor readable tables and detail panels over advanced dashboards
- keep database changes minimal but intentional

The goal is not to build a perfect back office. The goal is to give Edel enough control to launch safely.

