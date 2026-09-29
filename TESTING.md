# CelebrateHub — Feature Test Plan

Manual test plan for every feature in the app. Use it to verify changes end-to-end:
run a case → note the result (pass/fail) → fix → re-run the same case.

- **App**: `app/` — Expo Router + NativeWind, light theme, port `8081` (Expo Go / web).
- **Server**: `server/` — Express + Prisma 7 + PostgreSQL (Neon), port `5000`.
- Every screen in `app/src/app/**` is backed by a real API unless explicitly listed
  in [§6 Known gaps](#6-known-gaps--not-yet-real).

---

## 1. One-time setup

### 1.1 Server

```powershell
cd server
npm install
npm run prisma:generate     # REQUIRED after every schema change (generated client is gitignored)
npm run prisma:push         # sync schema to DB (no migrations directory in this repo)
npm run seed:admin          # admin account (see below)
npm run seed:categories     # service categories
npm run seed:plans          # subscription plans (provider/customer, monthly/yearly)
npm run seed:gifts          # optional: sample Gift Circle items on the first event
npm run dev                 # http://localhost:5000
```

Environment (`server/.env`, git-ignored):

| Key | Purpose |
|---|---|
| `PORT` | `5000` |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | token signing (currently placeholders — works locally) |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | **optional** — required only for paid subscription checkout (see G5) |

Smoke test:

```powershell
Invoke-RestMethod http://localhost:5000/api/subscriptions/plans
```

### 1.2 App

```powershell
cd app
npm install
npx expo install --fix      # align native deps with the installed SDK
# app/.env → EXPO_PUBLIC_API_URL="http://<this-machine-LAN-IP>:5000"  (phone needs your LAN IP, not localhost)
npx expo start              # press w = web, or scan QR with Expo Go
```

> After changing Expo/React Native APIs, re-read the versioned docs
> (`https://docs.expo.dev/versions/v57.0.0/`) — this project is SDK 57.

---

## 2. Test accounts

| Role | How to get one | Used for |
|---|---|---|
| ADMIN | `npm run seed:admin` → `superadmin@celebratehub.com` / `Admin@Secure99` | admin screens (§5.17) |
| CUSTOMER | App → Welcome → *Customer* → sign up | events, guests, gifts, reviews, club plan |
| PROVIDER | App → Welcome → *Provider* → sign up + business fields + categories | leads, bookings, provider profile, Pro plan |

Suggested flow to build test data quickly:

1. Register **one customer** and **one provider** (provider must pick ≥1 category, e.g. Catering).
2. Customer creates an event and selects the same category → lead is dispatched (§5.9).
3. Provider accepts the lead with a price → booking `CONFIRMED` (§5.10).
4. Customer writes a review on that booking → admin can moderate it (§5.14).

> Auth endpoints are rate-limited (`authLimiter`). Repeated bad logins return **429** — wait a minute instead of assuming a bug.

---

## 3. How to verify with the API directly

```powershell
# login (any role) → accessToken
$login = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method Post `
  -ContentType "application/json" `
  -Body '{"email":"superadmin@celebratehub.com","password":"Admin@Secure99"}'
$h = @{ Authorization = "Bearer $($login.data.accessToken)" }

Invoke-RestMethod -Uri "http://localhost:5000/api/admin/stats" -Headers $h
```

Every response body is `{ success, data | message }` (some list endpoints return named keys
like `{ leads }`, `{ plans }`, `{ reviews }`).

---

## 4. Data model quick reference

```
Event ─┬─ EventService ── Lead ── LeadProvider ── (accept) ── Booking ── Review
       ├─ Guest (invitationStatus, invitationChannel)
       └─ GiftItem / GiftContribution
Provider ── ProviderCategory / ProviderImage / AvailabilitySlot / Booking / Review
User (CUSTOMER | PROVIDER | ADMIN) ── Subscription(SubscriptionPlan) / Notification / PlatformIssue
PlatformSetting (MAX_PROVIDERS_PER_LEAD, PLATFORM_COMMISSION_PCT, INSTANT_LEAD_MATCHING, AUTO_APPROVE_VERIFIED_PROVIDERS)
```

Booking statuses used in code: `PENDING`, `CONFIRMED` (created on lead accept).
Review statuses: `APPROVED` (default), `FLAGGED`, `HIDDEN`.

---

## 5. Feature test cases

### 5.1 Register — customer
**Screen**: `(auth)/register.tsx` · **API**: `POST /api/auth/register`

1. Welcome → *Continue as Customer* → fill name, email, password (≥8, upper+lower+digit), confirm.
2. Submit.

**Expected**: session created, redirected to `/` (customer dashboard), profile readable via `GET /api/users/me`.
**Fail if**: login works but `/api/users/me` 401/404, or password rules aren't enforced server-side too.

### 5.2 Register — provider (service categories are live data)
**Screen**: `(auth)/register.tsx` · **API**: `POST /api/auth/register-provider`, `GET /api/events/categories`

1. Stop the server → open register (provider mode) → category chips.
   **Expected**: "We could not load service categories… **Retry**" + Retry button — **no fake categories**.
2. Start the server → Retry → chips appear (real DB categories).
3. Select ≥1 category, fill business name + coverage area → submit.

**Expected**: account created with `provider` profile; selected category IDs exist in
`GET /api/admin/categories`.
**Fail if**: any chip uses an ID that isn't a real `ServiceCategory.id` (e.g. `photography`).

### 5.3 Login, session restore, logout
**Screen**: `(auth)/login.tsx`, `(app)/index.tsx` · **API**: `POST /api/auth/login`, `GET /api/users/me`, `POST /api/auth/logout`

1. Login → restart app → still logged in (token persisted).
2. Home → sign out → confirm → back at Welcome; back navigation can't reach `/`.

**Expected**: cached user restored instantly; home still calls `getMe()` and refreshes the profile.
**Fail if**: dashboard renders a default role before the real one resolves (loading state should show instead).

### 5.4 Profile & password
**Screen**: `(app)/profile.tsx` · **API**: `PATCH /api/users/me`, `PATCH /api/users/me/password`

1. Edit name/phone → save → value persists after restart.
2. Change password with wrong current password → error, no change.
3. Change password correctly → login with the new password.

### 5.5 Customer dashboard (real stats)
**Screen**: `(app)/index.tsx` · **API**: `GET /api/events`

| Card | Source |
|---|---|
| My events | `events.length` |
| Bookings | count of `services[].lead.booking` across your events |
| Guests | sum of `events[]._count.guests` |

1. Fresh account with 0 events → all three show `—` then `0` after load (not hardcoded numbers).
2. Create 1 event with 1 service + add 3 guests → pull to refresh → `1 / 0 / 3`.
3. Provider accepts the lead → refresh → Bookings `1`.

**Fail if**: any of the three ever shows a fixed value (`3`, `4`, `45`).

### 5.6 Provider dashboard (real stats + real rating)
**Screen**: `(app)/index.tsx` · **API**: `GET /api/leads/stats`, `GET /api/users/me`

1. `New leads` / `Bookings` match `GET /api/leads/stats` (`availableCount`, `acceptedCount`).
2. With **no reviews**: Rating shows `—` + label "No reviews".
3. After a customer reviews a booking: Rating shows e.g. `4.5` + `Rating (1)`.
4. *Bookings & calendar* action opens Leads with the **Accepted** tab preselected (`/leads?tab=accepted`).

**Fail if**: rating is a fabricated `4.9` or the action lands on an empty/other tab.

### 5.7 Admin dashboard
**Screen**: `(app)/index.tsx` · **API**: `GET /api/admin/stats`

1. Login as admin → Users/Providers/Events/Bookings match `statsRes` values.
2. *Provider verifications* row shows `N PENDING` when a provider is pending.
3. Stop the server → pull to refresh → values show `—`, no crash, no fake fallbacks.

### 5.8 Events (create / list / detail / edit / delete)
**Screens**: `events/index.tsx`, `events/create.tsx`, `events/[id].tsx`
**API**: `GET|POST /api/events`, `GET|PATCH|DELETE /api/events/:id`

1. Create event (type, date, venue — pick from map/hubs or GPS, guest count, budget, categories).
   **Expected**: `status = DRAFT`, appears in *My events*, detail page opens.
2. Edit title/date → save → list + detail reflect it.
3. Delete → confirmation → gone from list; `GET /api/events/:id` → 404.
4. Non-owner (second account) tries `GET/PATCH /api/events/:id` → **403/404**.

**Note**: event *types* (Wedding, Birthday…) are a fixed enum in the client (`EVENT_TYPE_META`) —
that is presentation of a closed set, not fake data. The category list **is** loaded from the API.

### 5.9 Lead dispatch (event → providers)
**Screen**: event detail · **API**: `POST /api/events`, `POST /api/events/:id/services`,
`GET /api/leads?tab=available` (provider), `GET /api/leads/event/:eventId` (customer)

1. With `INSTANT_LEAD_MATCHING = true` (default): customer creates an event with a service
   category that a provider offers → provider's *Available* tab gains the lead and a
   `LEAD` notification is created.
2. Add a second service later → lead appears too.
3. Customer detail page shows matched providers for that service.

**Matching knobs**: `MAX_PROVIDERS_PER_LEAD` (default 5) controls how many providers are alerted.

### 5.10 Accept / decline lead → booking
**Screen**: `leads.tsx` · **API**: `GET /api/leads?tab=`, `POST /api/leads/:id/accept`, `POST /api/leads/:id/decline`

1. Provider → *Qualified leads* → **Accept** with price + notes.
   **Expected**: lead moves to *Accepted*; a `Booking` row exists with `status = CONFIRMED`,
   `agreedPrice` = entered price, commission computed from `PLATFORM_COMMISSION_PCT`.
2. Customer event detail now shows that provider + price.
3. Decline another lead with a reason → disappears from *Available*, appears in *History*.
4. Tabs: `available` shows only `PENDING/VIEWED` leads for `PENDING` leads, `accepted` shows
   accepted ones, `history` shows declined/expired.

### 5.11 Customer bookings view
**Screen**: `events/[id].tsx` · **API**: `GET /api/leads/event/:eventId`

Confirmed bookings appear under their service with provider contact (phone/mail buttons use
`tel:` / `mailto:` links).

### 5.12 Guests & invitations
**Screen**: `events/[id].tsx` · **API**: `GET|POST /api/guests/event/:eventId`,
`POST /api/guests/event/:eventId/bulk`, `PATCH|DELETE /api/guests/:id`, `POST /api/guests/:id/invite`,
`GET /api/guests/card/:eventId`

1. Add a guest (name + phone) → appears with `invitationStatus = PENDING`.
2. Send WhatsApp/SMS invite → app opens WhatsApp/SMS composer with the generated message →
   after sending, `POST /api/guests/:id/invite` marks the guest `SENT`; header counts update
   (`total / sent / delivered / pending`).
3. Edit/delete a guest → list + stats update.
4. Open `GET /api/guests/card/:eventId` (no auth) → public invitation payload.

**Fail if**: counts are static, or the app claims delivery without recording `SENT` (see G2).

### 5.13 Notifications
**Screen**: `notifications.tsx` · **API**: `GET /api/notifications`, `/unread-count`, `PATCH /:id/read`, `/read-all`, `DELETE /clear-read`

1. Trigger a lead (as provider) or a review (as provider) → bell badge count increments.
2. Open notifications → unread → read; badge clears after `read-all`.
3. Empty state shows when there are none (no fake entries).

### 5.14 Reviews & moderation (public data changes)
**Screens**: `events/[id].tsx` (write review), `provider-profile.tsx`, `admin-moderation.tsx`
**API**: `POST /api/reviews`, `GET /api/reviews/provider/:id`, `GET|PATCH /api/admin/reviews*`,
`GET /api/reviews/received`

1. Customer reviews their confirmed booking (rating + comment) → `status = APPROVED`,
   provider gets a `REVIEW` notification.
2. Second review on the same booking → **409**. Review on someone else's booking → **403**.
3. Provider profile shows the review and recomputed average (`provider.ratingAvg`).
4. Admin → *Reviews & Platform Disputes* → **Hide** a review.
   **Expected**: it disappears from `GET /api/reviews/provider/:id`, the provider's public
   average/count drop, and the admin card shows `Platform Avg` for **all** reviews
   (`—` when there are none — never `5.0`).
5. Admin → **Flag** → stays publicly visible, counted in `flaggedCount`.
6. Admin → **Delete** → removed everywhere and provider rating re-synced.

### 5.15 Provider profile & verification
**Screens**: `provider-profile.tsx`, `admin-providers.tsx`
**API**: `GET|PATCH /api/providers/me`, `PUT /api/providers/me/categories`, `PUT /api/providers/me/availability`,
`GET /api/providers/:id`, `PATCH /api/providers/:id/verification`

1. Provider edits business name, description, pricing, coverage → save → `GET /api/providers/me` reflects it.
2. Change categories → new leads only target the new categories.
3. Set availability slots → visible on the public provider page.
4. Admin → *Provider verifications* → set status VERIFIED/REJECTED → provider sees the new
   `verificationStatus`, `verifiedAt` set on VERIFIED.
5. Provider with 0 reviews shows `No reviews yet` (not `0.0`).

### 5.16 Subscriptions & billing
**Screen**: `subscriptions.tsx` · **API**: `GET /api/subscriptions/plans?role=`,
`POST /api/subscriptions/create-order`, `POST /api/subscriptions/verify-payment`, `POST /api/subscriptions/cancel`

1. Open as customer → only `customer-*` plans; as provider → only `provider-*` plans.
2. Monthly list: free plan first, then paid. Annual toggle:
   **Expected**: `SAVE N%` badge is **computed** from the monthly/yearly pair
   (provider: 999×12 vs 9990 → `SAVE 17%`; customer: 399×12 vs 3499 → `SAVE 27%`),
   and disappears if the plans are edited to have no savings.
3. Only the first paid plan in the visible list shows **Recommended**.
4. Each card's bullets are derived from that plan's own `description` + price/interval
   (no hardcoded marketing lists).
5. Select the **free** plan → activated immediately (`free: true`), banner shows plan + validity.
6. Select a paid plan → Razorpay checkout (needs keys, see G5) → after verification the
   active plan banner appears.
7. *Cancel Renew* on an active paid plan → `autoRenew=false`, still active until `endDate`.

### 5.17 Admin console
**Screens**: `admin-users`, `admin-categories`, `admin-plans`, `admin-moderation`,
`admin-analytics`, `admin-providers` · **API**: `/api/admin/*`

| Case | Expected |
|---|---|
| Users list/search/pagination | matches `GET /api/admin/users`, filters by role/status |
| Suspend/delete user | user status changes; deleted user can't log in |
| Categories CRUD | new category usable in event creation immediately |
| Plans CRUD | changed price shows on `subscriptions.tsx` after refresh |
| Stats/analytics | numbers come from `stats`/`analytics` responses; empty DB → `—`/`0`, never fabricated |
| Policy settings | see 5.18 |
| Disputes (Platform Issues) | create → appears in list → status transitions (OPEN → IN_PROGRESS → RESOLVED) |
| Error states | with the server stopped, each screen shows an inline error + Retry (no silent fake data, no mount-time Alert spam) |

### 5.18 Platform settings that actually do something
**Screen**: `admin-analytics.tsx` · **API**: `GET|PATCH /api/admin/settings/:key`

| Setting | Behaviour |
|---|---|
| `MAX_PROVIDERS_PER_LEAD` | number of providers alerted per lead (default 5). Set to `1` → only 1 provider receives the next lead. |
| `PLATFORM_COMMISSION_PCT` | commission % applied when a booking is created from an accepted lead. Set `20` → next accepted booking has `commissionAmount = 20% of agreedPrice`. |
| `INSTANT_LEAD_MATCHING` | `true` (default): leads dispatched immediately at event/service creation. `false`: no dispatch at creation — leads are matched on-demand the next time **any provider opens their leads feed** (`GET /api/leads`). Test: set `false`, create an event as customer (no lead yet), open provider leads → lead appears. |
| `AUTO_APPROVE_VERIFIED_PROVIDERS` | **inert** — see G1. |

### 5.19 Gift Circle & registry
**Screen**: `events/gift-circle.tsx` · **API**: `GET /api/gifts/event/:eventId`,
`POST /api/gifts/event/:eventId/items`, `PATCH|DELETE /api/gifts/items/:id`,
`POST /api/gifts/event/:eventId/contribute`, `POST /api/gifts/contributions/:id/thank`

1. Host adds a wishlist item and a cash-fund item → both listed with real amounts.
2. Guest (or logged-out, `optionalAuth`) pledges an amount → item `collectedAmount` and
   circle totals move; contribution appears in the list.
3. Host *thanks* a contribution → status changes.
4. Claim/unclaim an item.
5. **Share** → message contains the real event name, date, venue and a `celebratehub://events/<id>`
   deep link (no raw "Event ID" line).
6. Totals/stats in the header equal the API `stats` block.

### 5.20 Location picker (real GPS)
**Screen**: `components/map/location-picker-modal.tsx`

1. **Device (Expo Go)**: tap **GPS** → permission prompt → coordinates + reverse-geocoded
   address fill the field; map pin/coords update.
2. Deny permission → explanation alert, hub list still usable (no crash).
3. Tap a hub → address + coords set instantly.
4. **Web**: GPS uses browser geolocation; the Leaflet map allows click/drag pin.
5. SERVICE_RADIUS mode (provider base location) → radius pills + area preview update.
6. Confirm → `events/create` / provider profile stores real `latitude`/`longitude`.

**Fail if**: GPS shows "select a venue below" without attempting device location.

### 5.21 Offline / error behaviour
1. Stop the server → pull-to-refresh on Home, Events, Leads, Subscriptions, Admin screens.
   **Expected**: inline error or `—` placeholders + retry affordance; app must not show
   fabricated values or crash.
2. Restart the server → refresh recovers data.
3. `npx expo start` with no network → app opens, shows loading/empty states.

---

## 6. Known gaps / not-yet-real

Documented deliberately so a test "failure" here is recognised as a known limitation (G-items
are candidates for the next iteration):

| # | Gap | Where |
|---|---|---|
| **G1** | `AUTO_APPROVE_VERIFIED_PROVIDERS` setting exists but is never read — there are no KYC/GSTIN/ID fields on `Provider` to base it on. | `admin.controller.ts` DEFAULT_SETTINGS |
| **G2** | No SMS/WhatsApp/email provider is integrated. Invitations are **recorded** (`invitationStatus = SENT`) after the user sends them manually via the OS share/WhatsApp/SMS composer; delivery receipts (`DELIVERED`) are never produced by the server. | `guests.service.ts`, no twilio/sendgrid/nodemailer anywhere |
| **G3** | Gift contributions are stored with `paymentStatus = PAID` without a payment gateway — pledges are recorded, not charged. | `gifts.service.ts` |
| **G4** | Booking status never transitions past `CONFIRMED` → admin `completedBookings` stays `0`, and completion-based GMV/commission reporting has no trigger. | `leads.acceptLead`, admin stats |
| **G5** | Paid subscription checkout needs `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET`; without them only the free-plan path is testable. | `subscriptions.service.ts` |
| **G6** | Free-plan lead quota ("up to 5 leads/month" copy) is **not enforced** server-side. | `leads.service.ts` |
| **G7** | No migrations directory — schema changes use `npm run prisma:push`. Never edit `server/src/generated/prisma` by hand; run `npm run prisma:generate`. | `server/prisma` |
| **G8** | `JWT_SECRET` / `JWT_REFRESH_SECRET` are placeholders in `.env`. | `server/.env` |
| **G9** | Event types (Wedding/Birthday/…) are a closed client-side enum; `/api/events/categories` returns service categories only. Intentional — not fake data. | `events.api.ts` |
| **G10** | `app/eslint.config.js` + `eslint`/`eslint-config-expo` were added in an earlier session and are still untracked — decide whether to keep them before committing. | `app/` |

---

## 7. Regression checklist (run before calling any change done)

```powershell
cd app   ; npx tsc --noEmit ; npx expo lint
cd server; npx tsc --noEmit
```

- `npx tsc --noEmit` must be clean in **both** projects.
- Lint has a pre-existing baseline of errors (notably `react-hooks/set-state-in-effect`
  from the `useEffect(() => { loadData(); })` pattern used across screens, and
  `react/no-unescaped-entities`). Your change must not **add** new ones —
  diff the eslint output for the files you touched.
- After any `schema.prisma` edit: `npm run prisma:generate` (+ `prisma:push`) then restart
  the server — stale generated clients cause 500s on the endpoints that use new fields.
- Smoke test the touched endpoints with the curl/`Invoke-RestMethod` snippets in §3.

---

## 8. Suggested iteration loop

1. Pick one feature section (§5).
2. Set up the data it needs (§2).
3. Execute every **Expected** / **Fail if** line; record results.
4. Anything failing → classify: real bug, known gap (§6), or missing feature.
5. Fix, run §7, re-run the same section end-to-end.
6. Move to the next section.
