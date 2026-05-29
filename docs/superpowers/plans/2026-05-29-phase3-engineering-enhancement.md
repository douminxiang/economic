# Phase 3: Engineering Enhancement - Implementation Plan

**Date:** 2026-05-29
**Scope:** WebSocket, Alipay Payment, Monitoring & Analytics, App Store Deployment

---

## Current State Summary

| Aspect | Status |
|--------|--------|
| Server | NestJS 11 + Prisma 7 + MySQL, 16 modules, JWT auth, REST API |
| Mobile | React Native 0.85.3, 20 screens, Zustand stores, React Query, i18n |
| Payment | UI only (PaymentScreen), backend `pay()` just flips status to 1 |
| WebSocket | None |
| Monitoring | None |
| Deployment | Debug keystore only, no ProGuard, no CI/CD |

---

## FEATURE 5: WebSocket Real-time Communication

### 5.1 Architecture & Data Flow

```
┌──────────────┐     Socket.IO      ┌──────────────────┐
│  Mobile App  │◄──────────────────►│  NestJS Server   │
│  socket.io-  │   JWT handshake    │  @nestjs/        │
│  client      │                    │  websockets +    │
│              │                    │  socket.io       │
│  useSocket() │                    │                  │
│  hook        │                    │  EventsGateway   │
└──────┬───────┘                    └────────┬─────────┘
       │                                     │
       │  subscribe:                         │  emit on events:
       │  order:statusChanged                │  - order status change
       │  order:riderLocation                │  - rider position update
       │                                     │
       │                                     ▼
       │                            ┌──────────────────┐
       │                            │   Prisma/MySQL   │
       │                            │   Order table     │
       │                            │   (status field)  │
       │                            └──────────────────┘
```

**Flow:**
1. Mobile connects to Socket.IO on app launch (if authenticated)
2. JWT token passed as query param during handshake; validated in `EventsGateway.handleConnection()`
3. Client joins personal room: `socket.join(user:${userId})`
4. When `OrderService.updateStatus()` is called (pay, prepare, deliver, confirm), it emits `order:statusChanged` to the user's room
5. During delivery (status=3), a simulated rider position emitter runs every 5 seconds, emitting `order:riderLocation` with lat/lng
6. Frontend `useSocket` hook provides typed subscription; components subscribe/unsubscribe on mount/unmount
7. `OrderDetailScreen` receives real-time status updates without polling
8. `MapScreen` receives rider location and updates a `Marker` on the Amap view

### 5.2 Files to Create

**Server:**

| File | Purpose |
|------|---------|
| `apps/server/src/modules/events/events.gateway.ts` | Socket.IO gateway with JWT auth, room management, event handlers |
| `apps/server/src/modules/events/events.module.ts` | Module registering gateway, exporting it for injection |
| `apps/server/src/modules/events/events.service.ts` | Business logic: emit order status, emit rider location, cleanup |
| `apps/server/src/modules/events/dto/socket-events.ts` | TypeScript interfaces for all socket event payloads |

**Mobile:**

| File | Purpose |
|------|---------|
| `apps/mobile/src/services/socket.ts` | Socket.IO client singleton, connection manager with auto-reconnect |
| `apps/mobile/src/hooks/useSocket.ts` | React hook for subscribing to socket events with cleanup |
| `apps/mobile/src/hooks/useOrderRealtime.ts` | Higher-level hook: subscribes to order status + rider location for a specific order |
| `apps/mobile/src/components/RealtimeStatusIndicator.tsx` | Animated status dot/badge component (pulsing dot when status is active) |

### 5.3 Files to Modify

| File | Change |
|------|--------|
| `apps/server/src/app.module.ts` | Import `EventsModule` |
| `apps/server/src/main.ts` | Attach Socket.IO to HTTP server using `app.getIo()` or platform adapter |
| `apps/server/src/modules/order/order.service.ts` | Inject `EventsService`; call `emitOrderStatusChanged()` after every status transition |
| `apps/mobile/src/services/api.ts` | Export `API_BASE_URL` constant (currently hardcoded `http://10.0.2.2:3000/api/v1`) for socket URL derivation |
| `apps/mobile/src/screens/OrderDetailScreen.tsx` | Replace static status card with `RealtimeStatusIndicator`; use `useOrderRealtime` hook |
| `apps/mobile/src/screens/MapScreen.tsx` | Add rider `Marker` during delivery status; subscribe to `order:riderLocation` |
| `apps/mobile/src/App.tsx` | Initialize socket connection on auth state change; disconnect on logout |

### 5.4 Dependencies to Install

**Server:**
```bash
cd apps/server
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
```

**Mobile:**
```bash
cd apps/mobile
npm install socket.io-client
```

### 5.5 Database Schema Changes

None required. Order status is already tracked. The WebSocket layer is purely a push notification mechanism over existing data.

### 5.6 API / Event Contracts

**Socket.IO Namespace:** `/` (default)

**Handshake:**
```
Client → Server: connection with { auth: { token: "JWT" } }
Server validates JWT, joins room "user:{userId}"
```

**Events (Server → Client):**

```typescript
// Order status changed
interface OrderStatusChangedEvent {
  orderId: number;
  orderNo: string;
  status: number;        // 0-5
  statusText: string;    // "pending" | "paid" | "preparing" | "delivering" | "completed" | "cancelled"
  updatedAt: string;     // ISO timestamp
}

// Rider location update (only during status=3)
interface RiderLocationEvent {
  orderId: number;
  latitude: number;
  longitude: number;
  speed: number;          // simulated m/s
  heading: number;        // degrees
  estimatedMinutes: number; // ETA
  timestamp: string;
}
```

**Events (Client → Server):**

```typescript
// Subscribe to order tracking
interface TrackOrderRequest {
  orderId: number;
}

// Stop tracking
interface UntrackOrderRequest {
  orderId: number;
}
```

### 5.7 UI Mockup Description

**RealtimeStatusIndicator Component:**
- A small colored dot (green=active, gray=inactive) that pulses with scale animation when status is transitioning
- Placed next to the status text in OrderDetailScreen's status card
- During delivery (status=3): shows a pulsing green dot + "Rider is on the way" subtext
- Animated using React Native `Animated` API (no extra dependency needed)

**MapScreen Rider Marker:**
- A motorcycle/scooter icon marker that moves on the Amap during delivery
- A dashed line drawn from shop to rider to delivery address (polyline)
- ETA badge at bottom of map: "Estimated delivery: X min"

### 5.8 Implementation Order

1. Create `EventsGateway` with JWT auth validation + room join/leave
2. Create `EventsService` with emit methods
3. Modify `OrderService` to emit on status changes
4. Create simulated rider location emitter (interval-based during delivery)
5. Create `socket.ts` client singleton with connection management
6. Create `useSocket` and `useOrderRealtime` hooks
7. Create `RealtimeStatusIndicator` component
8. Update `OrderDetailScreen` to use real-time updates
9. Update `MapScreen` to show rider location during delivery
10. Wire up in `App.tsx` (connect/disconnect lifecycle)

---

## FEATURE 6: Alipay Payment Integration

### 6.1 Architecture & Data Flow

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐
│  Mobile  │────►│  NestJS      │────►│  Alipay      │
│  App     │     │  Server      │     │  Sandbox     │
│          │◄────│              │◄────│              │
└──────────┘     └──────────────┘     └──────────────┘
     │                  │
     │  1. POST         │  2. create alipay order
     │  /orders/:id/pay │     (alipay-sdk)
     │                  │
     │  3. Return       │  4. alipay.trade.app.pay()
     │  pay params      │     returns pay URL/form
     │                  │
     │  5. Open         │  6. Alipay processes
     │  InAppBrowser    │     payment
     │                  │
     │  7. Redirect     │  8. POST /api/v1/payment/callback
     │  back to app     │     (alipay async notify)
     │                  │
     │  9. GET /payment/ │ 10. Verify signature,
     │  status/:orderNo │    update order status
     │                  │
     │ 11. Return       │
     │ payment result   │
```

**Flow:**
1. User taps "Pay Now" on PaymentScreen
2. Frontend calls `POST /orders/:id/pay` with `payMethod: "alipay"`
3. Backend creates Alipay trade order via `alipay-sdk`, gets pay parameters
4. Backend returns `payUrl` (or form data) to frontend
5. Frontend opens `react-native-inappbrowser` (or Linking) to Alipay URL
6. User completes payment in Alipay app/webview
7. Alipay sends async callback to `POST /payment/callback` (server-side)
8. Backend verifies signature, updates order status to 1 (paid), records `payTime`
9. Frontend polls `GET /payment/status/:orderNo` until status is "paid"
10. On success, navigates to success screen

### 6.2 Files to Create

**Server:**

| File | Purpose |
|------|---------|
| `apps/server/src/modules/payment/payment.module.ts` | Module with Alipay config, controller, service |
| `apps/server/src/modules/payment/payment.controller.ts` | Handles callback (POST /payment/callback), status query (GET /payment/status/:orderNo) |
| `apps/server/src/modules/payment/payment.service.ts` | Alipay SDK wrapper: createPayment, verifyCallback, queryPayment |
| `apps/server/src/modules/payment/dto/payment.dto.ts` | DTOs for callback verification, status query |

**Mobile:**

| File | Purpose |
|------|---------|
| `apps/mobile/src/services/payment.ts` | Payment API calls, polling logic, InAppBrowser integration |
| `apps/mobile/src/hooks/usePayment.ts` | Hook for payment flow: initiate, poll status, handle results |

### 6.3 Files to Modify

| File | Change |
|------|--------|
| `apps/server/src/app.module.ts` | Import `PaymentModule` |
| `apps/server/.env` | Add `ALIPAY_APP_ID`, `ALIPAY_PRIVATE_KEY`, `ALIPAY_PUBLIC_KEY`, `ALIPAY_NOTIFY_URL`, `ALIPAY_GATEWAY` |
| `apps/server/src/modules/order/order.service.ts` | Refactor `pay()` to return Alipay pay params instead of directly flipping status; status flip moves to callback handler |
| `apps/server/src/modules/order/order.controller.ts` | `PATCH /:id/pay` now returns pay URL/params instead of order object |
| `apps/mobile/src/screens/PaymentScreen.tsx` | Replace direct `payMut.mutate()` with: (1) get pay params, (2) open Alipay, (3) poll status, (4) show result |
| `apps/mobile/src/services/api.ts` | Add `paymentApi` with status polling endpoint |

### 6.4 Dependencies to Install

**Server:**
```bash
cd apps/server
npm install alipay-sdk
```

**Mobile:**
```bash
cd apps/mobile
npm install react-native-inappbrowser-reborn
# For Android deep link handling
# (react-native-inappbrowser-reborn handles this internally)
```

### 6.5 Database Schema Changes

No new tables needed. The existing `Order` model already has:
- `payMethod` (String) -- will store "alipay", "wechat", "unionpay"
- `payTime` (DateTime?) -- set on successful callback
- `status` (Int) -- flipped from 0 to 1 on callback

Optional enhancement: Add `tradeNo` field to Order for Alipay trade number tracking:
```prisma
// Add to Order model
tradeNo String? @db.VarChar(64)  // Alipay trade_no for reconciliation
```

### 6.6 API Contracts

**POST /orders/:id/pay** (modified)
```typescript
// Request
{ payMethod: "alipay" }

// Response (success)
{
  code: 0,
  data: {
    tradeNo: "20260529xxxx",
    payUrl: "https://openapi.alipay.com/gateway.do?...",  // or form HTML
    orderNo: "20260529xxxx",
  }
}
```

**POST /payment/callback** (new, Alipay calls this)
```
Alipay sends form-encoded data:
  out_trade_no = "20260529xxxx"
  trade_no = "20260529220014xxxx"
  trade_status = "TRADE_SUCCESS"
  total_amount = "25.00"
  sign = "xxxxx"
  sign_type = "RSA2"

Response: "success" (Alipay expects this string)
```

**GET /payment/status/:orderNo** (new)
```typescript
// Response
{
  code: 0,
  data: {
    orderNo: "20260529xxxx",
    status: 1,            // 0=unpaid, 1=paid, 5=cancelled
    payMethod: "alipay",
    payTime: "2026-05-29T10:30:00.000Z",
  }
}
```

### 6.7 UI Mockup Description

**PaymentScreen (modified flow):**

1. **Initial state** (unchanged): Amount display, method selection (Alipay/WeChat/UnionPay), Pay button
2. **On Pay tap**: Button changes to spinner with "Opening Alipay..." text
3. **Alipay opens**: InAppBrowser slides up with Alipay sandbox payment page
4. **After Alipay closes**: Status polling overlay appears -- "Verifying payment..." with a checkmark animation
5. **Success**: Same success card as current, but now backed by real payment data
6. **Failure/Cancel**: Shows retry option with "Payment was not completed" message

**New "Payment Verifying" state (between Alipay close and confirmed):**
- Full-screen overlay with semi-transparent background
- Center card: animated checkmark that fills in gradually
- Text: "Verifying payment with Alipay..."
- Auto-dismisses when status=1 is confirmed
- Timeout after 30 seconds with retry option

### 6.8 Implementation Order

1. Configure Alipay sandbox account and get keys
2. Create `PaymentModule` with `PaymentService` (alipay-sdk wrapper)
3. Create `PaymentController` with callback and status endpoints
4. Add `ALIPAY_*` env vars to `.env`
5. Modify `OrderService.pay()` to create Alipay order and return pay params
6. Modify `OrderController` PATCH `/orders/:id/pay` to return pay URL
7. Create `payment.ts` service on mobile with polling logic
8. Create `usePayment` hook with full payment flow
9. Update `PaymentScreen` to use InAppBrowser + polling
10. Add `tradeNo` field to Order model (Prisma migration)
11. Test end-to-end with Alipay sandbox

---

## FEATURE 7: Monitoring & Analytics

### 7.1 Architecture & Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                    Mobile App                            │
│                                                          │
│  ┌──────────────┐    ┌─────────────────────┐            │
│  │ Sentry       │    │ tracker.ts          │            │
│  │ Error/Perf   │    │ - trackPageView()   │            │
│  │ Monitoring   │    │ - trackEvent()      │            │
│  └──────┬───────┘    │ - trackClick()      │            │
│         │            └──────────┬──────────┘            │
│         │                       │                        │
│         │  ┌────────────────────┘                       │
│         │  │  HTTP POST /events/track                   │
│         ▼  ▼                                            │
│  ┌──────────────┐    ┌─────────────────────┐            │
│  │ React        │    │ NestJS Server       │            │
│  │ Navigation   │    │                     │            │
│  │ onStateChange│    │ EventsModule        │            │
│  │ → auto track │    │ POST /events/track  │            │
│  └──────────────┘    │ → Prisma TrackEvent │            │
│                      └──────────┬──────────┘            │
│                                 │                        │
│                      ┌──────────▼──────────┐            │
│                      │ Prisma / MySQL      │            │
│                      │ track_events table  │            │
│                      └─────────────────────┘            │
│                                                          │
│  ┌──────────────┐                                       │
│  │ @sentry/     │                                       │
│  │ react-native │──► Sentry SaaS (free tier)            │
│  └──────────────┘                                       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    Server                                │
│  ┌──────────────┐                                       │
│  │ @sentry/     │                                       │
│  │ nestjs       │──► Sentry SaaS                        │
│  └──────────────┘                                       │
└─────────────────────────────────────────────────────────┘
```

**Flow:**
1. Sentry initialized on app start (mobile) and server bootstrap
2. All unhandled errors/crashes auto-report to Sentry
3. Custom tracker: on every React Navigation state change, `trackPageView()` fires
4. User interactions (button taps, search, order creation) fire `trackEvent()`
5. Events sent to server `POST /events/track` for custom analytics storage
6. Server stores in `track_events` table for later analysis
7. Settings screen has analytics toggle: if disabled, tracker stops sending (Sentry error tracking remains)

### 7.2 Files to Create

**Server:**

| File | Purpose |
|------|---------|
| `apps/server/src/modules/events/events-tracker.module.ts` | Separate module for analytics (to avoid conflict with WebSocket EventsModule -- rename to `analytics` if needed) |
| `apps/server/src/modules/analytics/analytics.module.ts` | Module for event tracking |
| `apps/server/src/modules/analytics/analytics.controller.ts` | POST /events/track endpoint |
| `apps/server/src/modules/analytics/analytics.service.ts` | Store events in DB |
| `apps/server/src/modules/analytics/dto/track-event.dto.ts` | DTO validation for event payloads |
| `apps/server/src/sentry.ts` | Sentry initialization helper for server |

**Mobile:**

| File | Purpose |
|------|---------|
| `apps/mobile/src/utils/tracker.ts` | Analytics tracker: trackPageView, trackEvent, trackClick, identifyUser |
| `apps/mobile/src/utils/sentry.ts` | Sentry init configuration for React Native |
| `apps/mobile/src/components/AnalyticsProvider.tsx` | Context provider that wraps navigation listener for auto page tracking |

### 7.3 Files to Modify

| File | Change |
|------|--------|
| `apps/server/src/main.ts` | Import Sentry init before `NestFactory.create()`; add Sentry exception filter |
| `apps/server/src/app.module.ts` | Import `AnalyticsModule` |
| `apps/server/.env` | Add `SENTRY_DSN` |
| `apps/mobile/src/App.tsx` | Import Sentry init; wrap root with `AnalyticsProvider` |
| `apps/mobile/src/navigation/RootNavigator.tsx` | Add `AnalyticsProvider` wrapper |
| `apps/mobile/src/navigation/MainTabs.tsx` | Register screen change listener for page view tracking |
| `apps/mobile/package.json` | Add Sentry + analytics deps |
| `apps/mobile/src/screens/profile/` (ProfileStack) | Add analytics toggle in settings |

### 7.4 Dependencies to Install

**Server:**
```bash
cd apps/server
npm install @sentry/nestjs @sentry/node
```

**Mobile:**
```bash
cd apps/mobile
npm install @sentry/react-native
```

### 7.5 Database Schema Changes

New `track_events` table:
```prisma
model TrackEvent {
  id         Int      @id @default(autoincrement())
  userId     Int?
  eventType  String   @db.VarChar(50)   // "page_view" | "click" | "search" | "order" | "custom"
  eventName  String   @db.VarChar(100)  // "HomeScreen" | "pay_button_tap" | etc.
  properties Json?                       // { screen: "Home", ... }
  platform   String   @db.VarChar(20)   // "ios" | "android"
  appVersion String?  @db.VarChar(20)
  deviceId   String?  @db.VarChar(100)
  createdAt  DateTime @default(now())

  @@index([userId])
  @@index([eventType])
  @@index([createdAt])
  @@map("track_events")
}
```

### 7.6 API Contracts

**POST /events/track**
```typescript
// Request
{
  eventType: "page_view",     // page_view | click | search | order | custom
  eventName: "HomeScreen",    // screen name or event name
  properties: {               // optional extra data
    keyword: "noodles",
    shopId: 42,
  },
  platform: "android",
  appVersion: "1.0.0",
  deviceId: "abc123",
}

// Response
{
  code: 0,
  data: { tracked: true }
}
```

### 7.7 UI Mockup Description

**Analytics Toggle (in Profile/Settings):**
- A single toggle row: "Usage Analytics" with subtext "Help improve the app by sharing anonymous usage data"
- Switch component using existing theme colors
- Toggle state persisted in MMKV storage
- When OFF: tracker methods become no-ops, no events sent
- When ON: all tracking resumes

No other UI changes -- analytics is entirely invisible to the user.

### 7.8 Implementation Order

1. Create Prisma `TrackEvent` model + migration
2. Set up Sentry accounts (free tier) and get DSN values
3. Create `sentry.ts` init helpers (server + mobile)
4. Create `AnalyticsModule` on server (controller, service, DTO)
5. Create `tracker.ts` utility on mobile
6. Create `AnalyticsProvider` with navigation listener
7. Wire up in `App.tsx` and `RootNavigator.tsx`
8. Add analytics toggle in Profile/Settings screen
9. Add `SENTRY_DSN` to `.env`
10. Test: verify events appear in both Sentry dashboard and MySQL `track_events`

---

## FEATURE 8: App Store Deployment

### 8.1 Architecture & Data Flow

```
┌─────────────────────────────────────────────────┐
│               CI/CD Pipeline                     │
│                                                  │
│  GitHub Push/PR ──► GitHub Actions               │
│       │                                          │
│       ├──► Lint + Type Check                     │
│       ├──► Unit Tests                            │
│       │                                          │
│       ├──► Android Build                         │
│       │    ├── ./gradlew assembleRelease         │
│       │    ├── Signed AAB                        │
│       │    └── Upload to Play Console (internal) │
│       │                                          │
│       ├──► iOS Build (macOS runner)              │
│       │    ├── xcodebuild                        │
│       │    ├── Export IPA                        │
│       │    └── Upload to TestFlight              │
│       │                                          │
│       └──► Server Deploy (optional)              │
│            ├── Docker build                      │
│            └── Deploy to cloud                   │
└─────────────────────────────────────────────────┘
```

### 8.2 Files to Create

**Root:**

| File | Purpose |
|------|---------|
| `.github/workflows/ci.yml` | GitHub Actions: lint, test, build |
| `.github/workflows/android-release.yml` | Android release build + Play Store upload |
| `.github/workflows/ios-release.yml` | iOS release build + TestFlight upload |
| `fastlane/Fastfile` | Fastlane configuration for Android + iOS |
| `fastlane/Appfile` | App identifiers and credentials |
| `fastlane/Matchfile` | iOS code signing via match (or manual) |
| `scripts/build-android.sh` | Local Android AAB build script |
| `scripts/build-ios.sh` | Local iOS IPA build script |

**Android:**

| File | Purpose |
|------|---------|
| `apps/mobile/android/app/release.keystore` | Generated release keystore (gitignored) |
| `apps/mobile/android/keystore.properties` | Keystore credentials (gitignored) |
| `apps/mobile/android/app/proguard-rules.pro` | Updated with React Native + library keep rules |

**iOS:**

| File | Purpose |
|------|---------|
| `apps/mobile/ios/EconomicMobile/Images.xcassets/AppIcon.appiconset/Contents.json` | App icon set with all required sizes |
| `apps/mobile/ios/EconomicMobile/Assets.xcassets/` | Asset catalog for launch screen images |
| `apps/mobile/ios/EconomicMobile/Info.plist` | Updated with URL schemes for Alipay callback |

### 8.3 Files to Modify

| File | Change |
|------|--------|
| `apps/mobile/android/app/build.gradle` | Add release signing config, enable ProGuard, version management |
| `apps/mobile/android/app/proguard-rules.pro` | Add comprehensive keep rules for RN, Hermes, Amap, Sentry, Socket.IO |
| `apps/mobile/android/build.gradle` | (root) Ensure correct build tools version |
| `apps/mobile/ios/EconomicMobile.xcodeproj/project.pbxproj` | Set development team, bundle identifier, signing |
| `apps/mobile/ios/EconomicMobile/Info.plist` | Add `LSApplicationQueriesSchemes` for Alipay/WeChat, set version |
| `apps/mobile/ios/Podfile` | Ensure correct platform target, add any needed post_install hooks |
| `.gitignore` | Add `*.keystore`, `keystore.properties`, `fastlane/report.xml`, build artifacts |

### 8.4 Dependencies to Install

**Development machine (not npm):**
```bash
# Install Fastlane (Ruby gem or brew)
brew install fastlane
# Or via RubyGems
gem install fastlane
```

**Mobile (no new npm deps needed for deployment itself, but for signing):**
```bash
# No additional npm packages needed for this feature
# Alipay SDK (already in Feature 6)
```

### 8.5 Database Schema Changes

None.

### 8.6 Detailed Configuration

**Android Release Keystore Generation:**
```bash
keytool -genkeypair -v -storetype PKCS12 \
  -keystore apps/mobile/android/app/release.keystore \
  -alias economic-release \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass <SECURE_PASSWORD> \
  -keypass <SECURE_PASSWORD> \
  -dname "CN=Economic, OU=Development, O=Economic, L=Hangzhou, ST=Zhejiang, C=CN"
```

**Android build.gradle Release Config:**
```groovy
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    signingConfigs {
        release {
            storeFile file(keystoreProperties['storeFile'] ?: 'release.keystore')
            storePassword keystoreProperties['storePassword'] ?: ''
            keyAlias keystoreProperties['keyAlias'] ?: ''
            keyPassword keystoreProperties['keyPassword'] ?: ''
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro"
        }
    }
}
```

**ProGuard Rules (essential):**
```proguard
# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# Amap
-keep class com.amap.api.** { *; }
-keep class com.autonavi.** { *; }

# Sentry
-keep class io.sentry.** { *; }

# Socket.IO
-keep class io.socket.** { *; }

# Alipay
-keep class com.alipay.** { *; }

# Hermes
-keep class hermes.** { *; }
```

**Fastlane Fastfile:**
```ruby
default_platform(:android)

platform :android do
  lane :build do
    gradle(task: "assembleRelease")
  end

  lane :deploy do
    gradle(task: "bundleRelease")
    upload_to_play_store(track: 'internal', aab: 'app/build/outputs/bundle/release/app-release.aab')
  end
end

platform :ios do
  lane :build do
    build_ios_app(
      workspace: "EconomicMobile.xcworkspace",
      scheme: "EconomicMobile",
      export_method: "app-store"
    )
  end

  lane :deploy do
    build_ios_app(
      workspace: "EconomicMobile.xcworkspace",
      scheme: "EconomicMobile",
      export_method: "app-store"
    )
    upload_to_testflight
  end
end
```

**GitHub Actions CI (ci.yml):**
```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'
      - run: npm ci
      - run: npm run lint --workspace=@economic/server
      - run: npm run build --workspace=@economic/server
      - run: npm test --workspace=@economic/server

  build-android:
    needs: lint-and-test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: 17
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'
      - run: npm ci
      - name: Decode keystore
        run: echo "${{ secrets.ANDROID_KEYSTORE_BASE64 }}" | base64 -d > apps/mobile/android/app/release.keystore
      - name: Build AAB
        working-directory: apps/mobile/android
        run: ./gradlew bundleRelease
      - uses: actions/upload-artifact@v4
        with:
          name: android-release.aab
          path: apps/mobile/android/app/build/outputs/bundle/release/app-release.aab
```

### 8.7 UI Mockup Description

No UI changes for this feature. All work is build configuration, signing, and CI/CD pipeline.

### 8.8 Implementation Order

1. Generate Android release keystore (securely store credentials)
2. Update `build.gradle` with release signing config
3. Write comprehensive ProGuard rules
4. Enable ProGuard + minification in build.gradle
5. Build and test release AAB locally
6. Configure iOS project: set development team, bundle ID
7. Configure App Icon asset catalog (all sizes)
8. Set up Apple Developer account + certificates (manual or match)
9. Create `fastlane/Fastfile` for both platforms
10. Create GitHub Actions workflow files
11. Set up GitHub Secrets (keystore base64, passwords, Apple credentials)
12. Test full CI pipeline on a push
13. Prepare store metadata: description, screenshots, privacy policy URL

---

## Overall Phase 3 Implementation Order

The four features should be implemented in this sequence due to dependencies:

### Step 1: Feature 7 - Monitoring & Analytics (Foundation)
**Rationale:** Error tracking should be in place BEFORE adding new features (WebSocket, Payment) so any issues during development are captured immediately.

- Set up Sentry accounts (5 min)
- Create TrackEvent model + migration
- Implement server Sentry init + AnalyticsModule
- Implement mobile Sentry init + tracker.ts
- Wire up navigation auto-tracking
- Add analytics toggle in settings

### Step 2: Feature 5 - WebSocket Real-time Communication
**Rationale:** Foundational for real-time order status, which Payment integration also benefits from.

- Install WebSocket dependencies
- Create EventsGateway + EventsService
- Modify OrderService to emit status changes
- Create simulated rider position emitter
- Create socket client singleton + hooks on mobile
- Update OrderDetailScreen with real-time status
- Update MapScreen with rider tracking

### Step 3: Feature 6 - Alipay Payment Integration
**Rationale:** Depends on WebSocket (for real-time payment confirmation) and benefits from monitoring (Sentry catches any payment errors).

- Configure Alipay sandbox account
- Install alipay-sdk
- Create PaymentModule (service + controller)
- Refactor OrderService.pay() to return pay params
- Create mobile payment flow with InAppBrowser + polling
- Update PaymentScreen with real payment flow
- Add tradeNo field to Order model

### Step 4: Feature 8 - App Store Deployment
**Rationale:** Must be last -- all features need to be complete and tested before building release binaries.

- Generate release keystore
- Configure ProGuard rules
- Set up iOS signing
- Create Fastlane configuration
- Create GitHub Actions CI/CD
- Build and test release binaries
- Prepare store metadata

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Alipay sandbox account setup delays | Start Feature 6 early; use mock mode as fallback |
| WebSocket memory leaks on mobile | Proper cleanup in useEffect return; connection pooling |
| Sentry free tier data limits | Implement sampling (100% errors, 20% performance) |
| ProGuard breaking native modules | Test with `./gradlew assembleRelease` early and often |
| iOS code signing complexity | Use manual signing first; automate with match later |
| Socket.IO + NestJS version compatibility | Pin versions: socket.io@4.x + @nestjs/websockets@11.x |

---

## Environment Variables Summary

New variables to add to `.env`:
```env
# Feature 5: WebSocket (no env needed, uses existing JWT_SECRET)

# Feature 6: Alipay
ALIPAY_APP_ID="2021000000000000"          # Sandbox app ID
ALIPAY_PRIVATE_KEY="MIIEvQIBADANBg..."    # App private key (RSA2)
ALIPAY_PUBLIC_KEY="MIIBIjANBgkq..."       # Alipay public key
ALIPAY_NOTIFY_URL="https://your-server.com/api/v1/payment/callback"
ALIPAY_GATEWAY="https://openapi-sandbox.dl.alipaydev.com/gateway.do"
ALIPAY_SIGN_TYPE="RSA2"

# Feature 7: Sentry
SENTRY_DSN="https://xxx@sentry.io/xxx"         # Server DSN
SENTRY_DSN_MOBILE="https://xxx@sentry.io/xxx"  # Mobile DSN (optional, can use same)
SENTRY_ENVIRONMENT="development"
SENTRY_TRACES_SAMPLE_RATE=0.2

# Feature 8: Deployment (GitHub Secrets, not .env)
# ANDROID_KEYSTORE_BASE64
# ANDROID_KEYSTORE_PASSWORD
# ANDROID_KEY_ALIAS
# ANDROID_KEY_PASSWORD
# APPLE_TEAM_ID
# APPLE_CERTIFICATE_BASE64
# FASTLANE_SESSION (for match)
```
