# CelebrateHub

**Event Services Marketplace & Management Platform**

CelebrateHub connects customers planning celebrations with local service providers — venues, caterers, photographers, decorators and more. Customers create events, select required services, and are matched with verified providers. Providers receive qualified leads on a first-come, first-served basis. Admins manage users, verifications, subscriptions and platform activity.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile App | React Native 0.86 + Expo 57 + TypeScript |
| Routing | Expo Router (file-based) |
| Styling | NativeWind (TailwindCSS for RN) |
| State | Zustand |
| Animations | React Native Reanimated 4 |
| Backend | Node.js + Express 5 + TypeScript |
| Database | PostgreSQL (Neon) + Prisma 7 ORM |
| Auth | JWT (access + refresh token rotation) + bcryptjs |
| Validation | Zod |
| Security | Helmet, express-rate-limit, CORS |

---

## Project Structure

```
CelebrateHub/
├── app/                        # React Native / Expo mobile app
│   └── src/
│       ├── app/
│       │   ├── (auth)/         # Unauthenticated screens
│       │   │   ├── welcome.tsx
│       │   │   ├── login.tsx
│       │   │   └── register.tsx
│       │   └── (app)/          # Authenticated screens
│       │       ├── index.tsx   # Home / role dashboard
│       │       ├── profile.tsx # User profile
│       │       └── admin-users.tsx # Admin user management
│       ├── components/
│       │   └── ui/
│       │       ├── Button.tsx
│       │       ├── FormInput.tsx
│       │       └── pro-icon.tsx
│       ├── store/
│       │   └── auth.store.ts   # Zustand auth state
│       └── lib/
│           └── auth.api.ts     # Axios API client
│
└── server/                     # Express backend
    ├── prisma/
    │   ├── schema.prisma       # Full DB schema
    │   └── seed-admin.ts       # Seed initial admin user
    └── src/
        ├── modules/
        │   ├── auth/           # Register, login, refresh, logout
        │   ├── users/          # Get current user (me)
        │   └── admin/          # User list, status update, delete
        ├── middleware/
        │   └── auth.middleware.ts  # requireAuth + requireRole
        ├── lib/
        │   ├── prisma.ts
        │   └── jwt.ts
        └── app.ts
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database (or a [Neon](https://neon.tech) connection string)
- Expo Go app on your device, or an Android/iOS simulator

---

### Backend Setup

```bash
cd server
npm install
```

Create `server/.env`:

```env
PORT=5000
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require"
JWT_SECRET="your-access-secret"
JWT_REFRESH_SECRET="your-refresh-secret"
```

Run database migrations and seed admin:

```bash
npx prisma generate
npx prisma db push
npm run seed:admin
```

Start the dev server:

```bash
npm run dev        # tsx watch — hot reload
```

Server runs on `http://localhost:5000`.

---

### Mobile App Setup

```bash
cd app
npm install
```

Create `app/.env`:

```env
EXPO_PUBLIC_API_URL=http://<YOUR_LOCAL_IP>:5000
```

> Use your machine's LAN IP (not `localhost`) so the device/emulator can reach the server.

Start Expo:

```bash
npx expo start
```

Scan the QR code with Expo Go, or press `a` (Android) / `i` (iOS).

---

## API Reference

### Auth — `/api/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/register` | — | Customer self-registration |
| `POST` | `/login` | — | Login (all roles) |
| `POST` | `/refresh` | — | Rotate refresh token |
| `POST` | `/logout` | Bearer | Revoke session |
| `GET` | `/me` | Bearer | Get current user profile |
| `POST` | `/admin/users` | Admin | Create any user (customer/provider/admin) |

### Admin — `/api/admin`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/users` | Admin | List users (search, role filter, pagination) |
| `PATCH` | `/users/:id/status` | Admin | Update user status (ACTIVE/INACTIVE/SUSPENDED) |
| `DELETE` | `/users/:id` | Admin | Delete user |

---

## Database Schema — Key Models

| Model | Description |
|-------|-------------|
| `User` | All users (CUSTOMER / PROVIDER / ADMIN) |
| `UserSession` | Refresh token sessions |
| `Provider` | Provider business profile |
| `ProviderCategory` | Provider ↔ Service category mapping |
| `ProviderImage` | Portfolio images |
| `ProviderAvailability` | Weekly availability slots |
| `ServiceCategory` | Platform service categories (venue, catering, etc.) |
| `Event` | Customer events |
| `EventService` | Services requested within an event |
| `Lead` | A service request open for providers to claim |
| `LeadProvider` | Which providers received a lead + their status |
| `Booking` | Confirmed connection between customer and provider |
| `Review` | Post-booking ratings and comments |
| `Subscription` | User subscription records |
| `SubscriptionPlan` | Available subscription plans |
| `Guest` | Event guest list |
| `Notification` | In-app + push notifications |
| `NotificationDelivery` | Per-channel delivery tracking |

---

## Feature Implementation Status

> **Legend:** ✅ Done · 🟡 Schema/partial · ❌ Not started

---

### 🔐 Auth & Infrastructure

| Feature | Status |
|---------|--------|
| Email + password registration & login | ✅ |
| JWT access + refresh token rotation | ✅ |
| Session management & revocation | ✅ |
| Role-based middleware (`requireAuth`, `requireRole`) | ✅ |
| Full PostgreSQL schema (all entities) | ✅ |
| OTP / phone verification | ❌ |
| Google / social auth | ❌ |
| Push notifications (Expo Push / FCM) | ❌ |
| File / image upload (Cloudinary / Supabase) | ❌ |
| Maps / geolocation integration | ✅ Interactive pin-drop modal, Google Maps navigation, provider coverage radius circle & Indian celebration hub selector |

---

### 👤 Customer Features

| Feature | Status |
|---------|--------|
| Registration, login & logout | ✅ |
| Profile view (read-only) | ✅ |
| Edit profile (name, email, phone, password) | ✅ Inline edit + Password modal |
| Create & manage events | ✅ |
| Event types (Wedding, Birthday, Corporate, etc.) | ✅ |
| Event fields (date, time, location, guests, budget) | ✅ |
| Select multiple services per event | ✅ |
| Provider discovery & matching | ✅ |
| Receive provider acceptance & booking status | ✅ |
| View accepted provider profiles & contact info | ✅ |
| Invite & manage guests | ✅ |
| Invitation delivery (WhatsApp, SMS, Native Share) | ✅ |
| Digital invitation card & templates | ✅ |
| Gift Circle | ✅ Registry, group cash funds, blessings wall & claim flow |
| Customer subscription plans & status | ✅ (Razorpay integrated) |
| In-app notifications & event updates | ✅ Notification Center (inbox, mark-read, bell badge) |
| Leave reviews after bookings | ✅ |

---

### 🏢 Service Provider Features

| Feature | Status |
|---------|--------|
| Provider self-registration & onboarding flow | ✅ Full onboarding (role switch, business details, categories, availability) |
| Admin-created provider account | ✅ |
| Business profile view (basic) | ✅ |
| Edit business profile (description, pricing, images) | ✅ |
| Provider verification workflow | ✅ Admin verification screen complete |
| Subscription plans for lead access | ✅ (Razorpay integrated) |
| Define service categories & coverage | ✅ |
| Availability management | ✅ |
| Receive leads (first-come, first-served) | ✅ |
| View accepted & previous leads | ✅ |
| Lead & status change notifications | ✅ |
| Customer ratings & reviews | ✅ |
| Provider subscription management | ✅ |

---

### 🛡️ Admin Features

| Feature | Status |
|---------|--------|
| Admin role & role-based dashboard | ✅ |
| Dashboard stats (total users, providers, customers) | ✅ Comprehensive stats (users, providers, events, bookings, GMV, lead conversion) |
| User list with search, filter, pagination | ✅ |
| Create users (customer / provider / admin) | ✅ |
| Suspend / activate / delete users | ✅ |
| Provider verification & approval screen | ✅ |
| Manage event & service categories | ✅ Dynamic CRUD (name, slug, icons, active toggles & linked counts) |
| Monitor customer requests & lead activity | ✅ |
| Manage reviews & platform issues | ✅ Trust & Safety moderation, review flag/hide/approve, dispute tracking & resolution notes |
| Manage subscription plans | ✅ Dynamic CRUD (pricing, intervals, MRR tracking, role tiers & Razorpay sync) |
| Configure max providers per lead | ✅ Configurable via Admin Policy Engine (`MAX_PROVIDERS_PER_LEAD`) & dynamic dispatch |
| Reports & analytics | ✅ Financials & KPIs, Gross Volume (GMV), conversion funnel, category demand balance & policy controls |

---

### 🔗 Lead Distribution & Matching

| Feature | Status |
|---------|--------|
| Match eligible providers (by category, location, availability) | ✅ |
| Simultaneously distribute to top N providers | ✅ |
| First-accept wins logic | ✅ |

---

### 💳 Payments & Subscriptions

| Feature | Status |
|---------|--------|
| Provider subscription payments | ✅ (Razorpay) |
| Customer subscription payments | ✅ (Razorpay) |
| Platform commission model | ✅ Configurable take-rate (`PLATFORM_COMMISSION_PCT`), booking commission deductions & payout tracking |

---

## Environment Variables

### `server/.env`

| Variable | Description |
|----------|-------------|
| `PORT` | HTTP server port (default `5000`) |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Access token signing secret |
| `JWT_REFRESH_SECRET` | Refresh token signing secret |

### `app/.env`

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_API_URL` | Backend base URL (e.g. `http://192.168.1.x:5000`) |

---

## Useful Commands

```bash
# Server
npm run dev            # Start dev server with hot reload
npm run seed:admin     # Seed initial admin account
npx prisma studio      # Open Prisma Studio (DB GUI)
npx prisma db push     # Push schema changes to DB

# App
npx expo start         # Start Expo dev server
npx expo start --android
npx expo start --ios
```

---

## Development Notes

- **Auth flow:** On login/register the server returns `accessToken` + `refreshToken`. The app stores both in `expo-secure-store`. The Axios client automatically retries with a refreshed token on `401`.
- **Role routing:** After login, `/(app)/index.tsx` reads the user role and renders the appropriate dashboard (Admin / Provider / Customer).
- **Provider creation:** Both vendor self-registration (via `/(auth)/register?role=provider` with instant profile, categories and availability setup) and Admin-created provider accounts are supported.
- **Database:** Hosted on [Neon](https://neon.tech) (serverless PostgreSQL). Prisma 7 uses the `@prisma/adapter-pg` driver adapter.

---

*CelebrateHub — Development build. Not for production use.*
