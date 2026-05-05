# Edel Platform — Full Project Blueprint
> Version: DRAFT v0.3 (In Progress) | Last Updated: April 2026
> Stack: HTML · CSS · JavaScript · Node.js (Express) · MySQL (Sequelize) · Socket.io
> Platform: Web-based (Mobile-first responsive design)

---

## 1. Project Overview

**Edel** is a web-based service marketplace platform that connects **customers** with **service providers** in their local area. The platform is location-aware, surfacing relevant services and requests based on proximity. It is designed to scale from a cash-first MVP toward a fully integrated payment and logistics system.

---

## 2. User Types

There are two types of end users plus an admin role:

### 2.1 Customer
A user who searches for and orders services/products from providers nearby.

### 2.2 Service Provider
A user who lists their services and receives orders from customers nearby.

### 2.3 Admin
A privileged user who manages the platform, resolves disputes, monitors activity, and controls platform settings. *(Details TBD — see Section 5.4)*

---

## 3. Tier System

All users (both customers and providers) start at the **Rookie** tier upon registration. Higher tiers will be introduced as the platform grows.

| Tier | Badge Color | Unlock Condition |
|------|-------------|-----------------|
| Rookie | Blue tick | Default — all new users |
| Veteran | TBD | Planned — post 1,000 users rollout |
| Elite | TBD | Planned — post 1,000 users rollout |
| Platinum | TBD | Planned — post 1,000 users rollout |

> **Note:** Exact progression logic (thresholds, criteria) for Veteran, Elite, and Platinum tiers will be defined by the client during the post-1,000 users phase. Badge colors and icons are also TBD. The backend must be designed to support a `tier` field from day one so future upgrades require no schema changes.

---

## 4. Rating System

### 4.1 Provider Rating
- All providers start at a **50% rating**.
- Rating **increases** with each successfully completed order that receives no complaint or report from a customer.
- Rating **decreases** when a customer files a report against a provider.
- The exact increment/decrement percentage values are TBD but must be configurable by admin.

### 4.2 Customer Rating
- All customers start at a **100% rating**.
- Each time a provider files a complaint against a customer, the rating **drops by 2%**.
- Customer rating is visible to providers and may influence whether a provider chooses to accept an order.

---

## 5. Screens / Pages

### 5.1 Discovery Page

This is the main home/landing page after login. Its content differs based on user type.

#### For Customers:
- Displays **trending products and services near the customer's current location**.
- Results are ordered from **closest to farthest** (by distance from the customer's GPS coordinates).
- A **search bar** at the top allows customers to search by keyword, service name, or category.
- Service categories are predefined (selectable) but also searchable via free text.
- Each listing card shows:
  - Provider name + profile photo
  - Service title
  - Service category
  - Price (flat rate or "From ₦X")
  - Distance from customer
  - Provider rating
  - Provider tier badge (e.g. blue tick for Rookie)
  - Availability status tag (Available / Busy / Unavailable)
- Customers can **tap a listing** to view full details and place an order.
- Listings tagged **Busy** or **Unavailable** are shown but the order button is disabled with an appropriate message.

#### For Service Providers:
- Displays **trending customer requests near the provider's current location**.
- Results ordered from closest to farthest.
- Providers can browse what customers in their area are requesting.

#### Shared Features:
- Location is tracked in real time using the browser's **Geolocation API**.
- If location access is denied, the user is prompted to enable it or manually enter their area.
- A **search bar** at the top of the page for filtering content.

---

### 5.2 Activities Page

This page is **blank by default**. It becomes active only when there is a **pending or active order**.

#### Provider View (Active Order):
- Displays details of the customer who placed the order:
  - Customer name
  - Phone number
  - Customer location
  - Time the order came in
- A provider can only handle **one active order at a time**.
- Provider must **accept or decline** an incoming order notification (delivered via Socket.io).
- If declined, the customer is notified and shown suggestions for the next nearest available provider.
- Once the provider accepts and travels to the customer, they click **"Scan QR to Start"** — this triggers the Service Verification System (see Section 8).

#### Customer View (Active Order):
- Displays details of the provider whose service they have ordered:
  - Provider name
  - Phone number
  - Provider location
  - **ETA** (Estimated Time of Arrival) — shown only if the provider is more than **500 meters** away from the customer
  - **Static map** showing the provider's current location (rendered via **Leaflet.js** with OpenStreetMap tiles — free, open source, no billing required)
- Once the provider is nearby and ready to begin, the customer clicks **"Start Service"** to generate a verification QR code (see Section 8).
- **Report Button**: Allows the customer to report the provider. On click, a text field is revealed for the customer to describe the issue. This triggers an admin alert.
- **Cancel Button**: Allows the customer to cancel an order. On click, a text field is revealed for the customer to provide a cancellation reason. Cancellations may affect ratings.

---

### 5.3 Transaction History Page

Displays a log of all **platform-related financial transactions**.

#### Current Scope (MVP):
- Customer-to-provider payments are **cash only** and handled **outside the platform** — they are **not logged** here at this stage.
- The only transactions recorded here are:
  - **Access Fee payments** made by providers via **Paystack** (one-time fee of ₦3,500).

#### Access Fee Logic:
- A provider's **first 3 orders** are completely **free**.
- After the 3rd completed order, the provider is **required to pay a one-time ₦3,500 access fee** before they can accept further orders.
- Payment is processed via **Paystack** (integrated on-platform).
- Once paid, the provider's account is permanently unlocked — the fee is **never charged again**.
- The Transaction History page logs:
  - Transaction ID
  - Date & time
  - Amount (₦3,500)
  - Payment status (Successful / Failed / Pending)
  - Paystack reference number

#### Future Scope (Post-MVP):
- Customer-to-provider payments will be handled on the platform.
- Full transaction history for both parties will be recorded and displayed here.

---

### 5.4 Admin Dashboard

*(To be fully specified — details pending. Section will be expanded in a future session.)*

High-level expectations:
- Manage users (customers and providers)
- View and resolve reported disputes
- Monitor platform activity and orders
- Control platform settings (tier thresholds, rating weights, access fee amount, etc.)
- View platform-wide transaction history

---

## 6. Authentication & User Onboarding

### 6.1 Registration — Customer

| Field | Required | Notes |
|-------|----------|-------|
| Full name | Yes | |
| Phone number | Yes | Used for contact and displayed during active orders |
| Email address | Yes | Used for login and notifications |
| Password | Yes | Hashed using bcrypt |
| Profile photo | No | Optional at registration |
| Location | Yes | Auto-detected via Geolocation API or manually entered |

### 6.2 Registration — Service Provider

| Field | Required | Notes |
|-------|----------|-------|
| Full name | Yes | |
| Phone number | Yes | Displayed to customers during active orders |
| Email address | Yes | |
| Password | Yes | Hashed using bcrypt |
| Profile photo | Yes | Shown on discovery listing cards |
| Service category | Yes | Chosen from a predefined list |
| Service title | Yes | e.g. "Home Plumbing Repairs" |
| Service description | Yes | Short text description |
| Pricing | Yes | Flat rate or "From ₦X" |
| Service photos | Yes | At least 1 required |
| Location | Yes | Auto-detected or manually entered |
| Availability status | Yes | Default: Available on registration |

> A provider can list a **maximum of 5 services**. All 5 can appear independently on the Discovery page but all link back to the same provider profile.

---

## 7. Availability Status (Providers)

Providers have 3 availability states:

| Status | Shown on Discovery? | Can Receive Orders? |
|--------|---------------------|---------------------|
| Available | Yes | Yes |
| Busy | Yes (tagged as Busy) | No — order button disabled |
| Unavailable | Yes (tagged as Unavailable) | No — order button disabled |

- A provider is automatically set to **Busy** when they have an active order.
- Providers can manually toggle between **Available** and **Unavailable**.
- All statuses are visible to customers on listing cards.

---

## 8. Order Flow

```
Customer taps a listing on the Discovery page
        |
        v
Customer taps "Order" button
        |
        v
Provider receives a real-time notification via Socket.io (accept/decline prompt)
        |
   _____|______________________________
  |                                    |
  v                                    v
[Provider Declines]              [Provider Accepts]
  |                                    |
  v                                    v
Customer notified of decline    Provider status --> Busy
Platform suggests nearest       Both parties enter Active Order state
available provider              Activities page activates (via Socket.io)
                                        |
                                        v
                          Provider travels to customer location
                                        |
                                        v
                    --- SERVICE START VERIFICATION (Section 8.1) ---
                                        |
                                        v
                           Service is marked as started
                                        |
                                        v
                           Job is completed
                           (cash payment handled outside platform — MVP)
                                        |
                                        v
                           Order marked as complete
                                        |
                                        v
                           Ratings updated for both parties
                                        |
                                        v
                      Provider's completed order count checked:
                      [Count 1-3: free]     [Count > 3: Paystack
                                             access fee prompt triggered]
```

---

### 8.1 Service Start Verification System

> This system was designed to replace the originally discussed "Adaptive Pulse Technology". Since the original concept was not compatible with browser-based platforms, this implementation achieves the same goal — confirming physical proximity between provider and customer — using QR codes and geolocation, both of which are natively supported in web browsers.

#### Purpose
To cryptographically confirm that a provider has **physically arrived at the customer's location** before a job is marked as started. Prevents fraud, false starts, and remote order manipulation.

---

#### Step 1 — Customer Generates QR Code

- Customer clicks **"Start Service"** on the Activities page.
- Browser requests current GPS coordinates via Geolocation API.
- Frontend sends `customer_id`, `lat`, `lng` to the backend (`POST /api/start-session`).
- Backend generates:
  - `session_id` — a UUID, unique per session
  - `secure_token` — cryptographically random string using Node.js `crypto.randomBytes()` (never `Math.random()`)
  - `expires_at` — exactly **3 minutes** from the time of creation (hardcoded, not user-configurable)
- Backend stores the session in the `sessions` table with `status = "pending"`.
- Backend returns `session_id` and `token` to the frontend.
- Frontend generates a **QR code** client-side (using a library such as `qrcode.js`) encoding:
  ```json
  { "session_id": "...", "token": "..." }
  ```
- The QR code is displayed to the customer. A countdown timer is shown. After 3 minutes it expires and the customer can regenerate.

---

#### Step 2 — Provider Scans QR Code

- Provider clicks **"Scan QR to Start"** on the Activities page.
- Browser opens camera using a WebRTC-based QR scanner (e.g. `html5-qrcode` library).
- Provider scans the customer's QR code. App extracts `session_id` and `token`.
- Browser requests the provider's current GPS coordinates.
- Frontend sends to backend (`POST /api/verify-session`):
  - `session_id`
  - `token`
  - `provider_id`
  - `provider_lat`
  - `provider_lng`

---

#### Step 3 — Backend Verification Logic

Checks are performed in this exact order. Any failure stops the chain and returns an error.

| Order | Check | Pass Condition | Failure Response |
|-------|-------|----------------|-----------------|
| A | Session exists | Record found in DB | "Invalid session" |
| B | Session status | status = "pending" | "Session already used or expired" |
| C | Expiry | Current time is before `expires_at` | "QR code has expired" |
| D | Token match | Submitted token matches stored token | "Invalid token" |
| E | Distance | Haversine distance between customer and provider is 50 meters or less | "You are not close enough to the customer" |
| F | GPS accuracy | Neither device reports accuracy worse than 100 meters | "Location accuracy too poor to verify" |

---

#### Step 4 — On Successful Verification

- Session record updated:
  - `status` set to `"started"`
  - `provider_id` recorded
  - `verified_at` timestamp recorded
  - `distance` (in meters) recorded
- New record inserted into the `verifications` table.
- Both the provider and customer receive a **Socket.io real-time event** confirming the service has started.
- Activities page updates automatically for both parties.

---

#### API Endpoints

**POST /api/start-session**
- Input: `customer_id`, `lat`, `lng`
- Output: `{ session_id, token }`

**POST /api/verify-session**
- Input: `session_id`, `token`, `provider_id`, `provider_lat`, `provider_lng`
- Output (success): `{ success: true, distance }`
- Output (failure): `{ success: false, error: "..." }`

---

#### Database Schema

**Table: sessions**

| Column | Type | Notes |
|--------|------|-------|
| id | INT, PK, auto-increment | |
| session_id | VARCHAR (UUID) | Unique per session |
| customer_id | INT, FK | References users table |
| token | VARCHAR | Cryptographically random |
| customer_lat | DECIMAL(10,8) | |
| customer_lng | DECIMAL(11,8) | |
| expires_at | DATETIME | 3 minutes from creation |
| status | ENUM('pending','started') | Default: 'pending' |

**Table: verifications**

| Column | Type | Notes |
|--------|------|-------|
| id | INT, PK, auto-increment | |
| session_id | VARCHAR, FK | References sessions table |
| provider_id | INT, FK | References users table |
| provider_lat | DECIMAL(10,8) | |
| provider_lng | DECIMAL(11,8) | |
| distance | DECIMAL(8,2) | Stored in meters |
| verified_at | DATETIME | |

---

#### Security Rules

- Token is **single-use** — once a session status is "started", all further scan attempts are rejected.
- QR code expires in exactly **3 minutes** — hardcoded server-side.
- All inputs are validated server-side regardless of what the frontend sends.
- Token generated using `crypto.randomBytes()` only.
- No session ID or token is ever reused.

---

#### Edge Cases Handled

| Scenario | Handling |
|----------|----------|
| Expired QR code | Clear error shown; customer can tap to regenerate a new QR code |
| Invalid or tampered token | Rejected with generic "Invalid session" error |
| Location permission denied | User prompted to enable location before the flow can proceed |
| Poor GPS accuracy (worse than 100m) | Rejected with an accuracy warning message |
| Duplicate scan (session already started) | Rejected — status check prevents reuse |
| Provider too far away (over 50m) | Rejected with distance warning; provider must physically move closer |
| Slow network | Frontend shows loading state; backend is safe to retry on network failure |

---

## 9. Technology Stack

| Concern | Technology | Notes |
|---------|------------|-------|
| Frontend | HTML, CSS, Vanilla JavaScript | No frontend framework |
| Backend | Node.js + Express | REST API |
| ORM / Database | Sequelize + MySQL | |
| Real-time communication | Socket.io | Order notifications, Activities page updates, service start events |
| Mapping | Leaflet.js + OpenStreetMap | Free, no billing. Used for static provider location map on Activities page. |
| Payments | Paystack | Access fee (₦3,500 one-time) — MVP only |
| Location | Browser Geolocation API | Used for discovery sorting and service verification |
| QR Code Generation | qrcode.js (client-side) | Rendered in browser, no server dependency |
| QR Code Scanning | html5-qrcode (client-side) | WebRTC camera access |
| Distance Calculation | Haversine formula | Implemented server-side in Node.js |
| Password Security | bcrypt | All passwords hashed before storage |
| Token Security | Node.js crypto module | crypto.randomBytes() for session tokens |

---

## 10. Pending / Open Items

| # | Item | Status |
|---|------|--------|
| 1 | Admin Dashboard — full feature list and permissions | Pending (to be discussed) |
| 2 | Tier progression logic — criteria for Veteran, Elite, Platinum | Pending (post-1,000 users phase) |
| 3 | Rating increment values — exact % per completed order for providers | Pending |
| 4 | Order cancellation impact on ratings — does cancelling reduce either party's rating? | TBD |
| 5 | Report handling workflow — what happens on the admin side after a report is filed | TBD |
| 6 | Tier badge design — colors and icons for Veteran, Elite, Platinum | TBD (design phase) |
| 7 | Post-MVP payment integration — full Paystack flow for customer-to-provider payments | Future scope |

---

*This document is a living blueprint and will be updated as more details are confirmed.*
