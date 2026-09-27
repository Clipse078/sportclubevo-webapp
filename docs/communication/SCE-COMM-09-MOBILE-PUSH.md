# SCE-COMM-09 — Mobile Push Notifications

**Programme:** SCE COMM  
**Branch:** `cursor/comm-09-mobile-push`  
**Baseline:** `origin/STAGE` @ `32247e01f3a88ec2092c9096fe7ccde56bb8a7cd`

---

## Programme invariants

- **Push is a Communication delivery channel; it is not a separate communication domain.**
- **Push device registrations belong to users/devices, not Teams, Sponsors, Campaigns or Communication records.**
- **Push recipient resolution starts from canonical dispatch-time Communication recipient snapshots** (via Notification delivery to `deliveryUserId` resolved at publish time).
- **A recipient without a Push-capable device does not cause Communication publication to fail.**
- **Push provider acceptance must not be reported as device delivery unless the provider genuinely confirms delivery** (Web Push reports provider acceptance only; `DELIVERED` is not claimed for PUSH — see `CHANNEL_SUPPORTS_DELIVERED_CONFIRMATION.PUSH = false` in `lib/communication/platform/channels.ts`).
- **COMM-09 does not implement Smart Reminders; reminder orchestration belongs to COMM-10.**

---

## 1. Client architecture (discovery)

| Area | Finding |
|------|---------|
| Client stack | Next.js 16 web application (React 19) |
| Native mobile | **Not present** (no React Native, Expo, Capacitor) |
| PWA / service worker | **Not present** in repository |
| Existing push SDKs | **None** in `package.json` prior to COMM-09 |
| Auth owner | Auth.js JWT session; `User` is global; tenant context via `TenantMembership` + active tenant |
| Notification owner | `lib/notifications/*` + `Notification` / `NotificationDelivery` |
| Communication delivery | Team publish → `emitTeamCommunicationPublishedNotifications` → `createNotificationIdempotent` |
| Background jobs | Notification email via cron routes; workspace background jobs separate |

---

## 2. Provider decision

| Field | Value |
|-------|--------|
| **Transport** | Web Push (HTTP) |
| **Provider** | VAPID Web Push (`web-push` npm package) |
| **Platforms** | `WEB` only (meaningful for current architecture) |
| **Why** | SCE ships as a web app; Web Push is the smallest provider-aligned path without inventing native infrastructure. Native iOS/Android can reuse the same registration/delivery seams later. |
| **Server adapter** | `PushProvider` in `lib/push/push-provider.ts` |
| **Client registration** | `lib/push/client/push-registration-client.ts` + `/api/push/devices` |
| **Background model** | Async cron processing of `NotificationDelivery` rows (`channel = PUSH`), same pattern as email |

---

## 3. Device registration ownership

Model: `PushDeviceRegistration`

- Owned by **`User`** (global), keyed by `(userId, installationId)`.
- Stores serialized subscription JSON server-side only (`subscriptionJson`).
- **Not** tenant-scoped; tenant safety enforced at **delivery** time via `TenantMembership` / active `Person` check.
- Idempotent register/update (token rotation updates same installation row).
- Revocation: per-device DELETE API; **logout revokes all active devices** for the session user.

Audit (no raw tokens): `DEVICE_REGISTERED`, `DEVICE_REVOKED` via `writeAuditRecord`.

---

## 4. Delivery flow

```
PlatformCommunication publish
  → recipient snapshots (COMM-03 truth)
  → emitTeamCommunicationPublishedNotifications(deliveryUserIds)
  → Notification + NotificationDelivery (IN_APP, EMAIL, PUSH)
  → cron: processPendingPushNotificationDeliveries
  → tenant eligibility + active PushDeviceRegistration(s)
  → NotificationPushDeliveryAttempt (unique per delivery + device)
  → PushProvider.send
```

Multi-device: one recipient may produce multiple device attempts; metrics distinguish `recipientCount` vs `deviceAttempts`.

Sender exclusion remains in notification producer (`excludeUserIds`).

---

## 5. Notification bridge & eligibility

Central bridge: **`createNotificationIdempotent`** creates PUSH delivery rows; team features do not call Push directly.

Push-eligible notification types (COMM-09):

- `TEAM_COMMUNICATION_PUBLISHED` (MESSAGE)
- `TEAM_ANNOUNCEMENT_PUBLISHED`
- `TEAM_ALERT_PUBLISHED`
- `TEAM_POLL_PUBLISHED`
- `TEAM_DATE_POLL_PUBLISHED`
- `TEAM_REQUEST_PUBLISHED`

Mapping: `lib/push/push-eligibility.ts`  
Alert priority: `TEAM_ALERT_PUBLISHED` → Web Push `urgency: high`.

---

## 6. Payload policy

Built in `lib/push/push-payload-builder.ts`:

- Title + concise body preview (max 180 chars)
- Canonical `href` deep link (team communication routes)
- `tenantId`, `notificationType`, `entityType`, `entityId` in data payload
- No full communication body duplication
- No device tokens in payload or logs

---

## 7. Preferences seam (COMM-17)

- `UserNotificationPreference.pushEnabled` column added (default `true`).
- Effective evaluation: `lib/push/push-preference-seam.ts`.
- Task/requirement types default `pushEnabled: false` until product expands scope.
- Sponsor/commercial categories remain governed by COMM-01 category eligibility (`SPONSOR_COMMERCIAL` excludes PUSH).

---

## 8. Persistence

| Model | Purpose |
|-------|---------|
| `PushDeviceRegistration` | User/device subscription |
| `NotificationPushDeliveryAttempt` | Per-device attempt telemetry |
| `NotificationDelivery` (`channel=PUSH`) | Per-notification push channel state |

Migration: `20260927230000_sce_comm_09_mobile_push` (after COMM-08 chain).

---

## 9. Environment variables

| Variable | Purpose |
|----------|---------|
| `PUSH_VAPID_PUBLIC_KEY` | Web Push VAPID public key |
| `PUSH_VAPID_PRIVATE_KEY` | Web Push VAPID private key |
| `PUSH_VAPID_SUBJECT` | mailto: or https: subject |
| `ACCEPTANCE_ENABLED_EXTERNAL_PROVIDERS` | Include `web-push` when running acceptance with real push |

When unset, push deliveries are **SKIPPED** (`NOT_CONFIGURED`); builds/tests use mock/disabled provider.

---

## 10. API (authenticated self-service)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/push/devices` | List own devices (no token material) |
| POST | `/api/push/devices` | Register/update installation |
| DELETE | `/api/push/devices/[registrationId]` | Revoke own device |
| GET | `/api/push/vapid-public-key` | Public key for client subscription |

---

## 11. COMM-10 / club / campaign seams

COMM-10 reminders should enqueue Notifications (or call the same push delivery processor) — **no separate token system**.

Club/campaign packages reuse:

- `PushDeviceRegistration` (user-global)
- `Notification` + `NotificationDelivery` PUSH channel
- `PushProvider` adapter

---

## 12. Known limitations

- No service worker shipped in COMM-09; browsers require caller-provided `PushSubscription` after explicit permission.
- No iOS/Android native token path yet (`PushDevicePlatform` extensible).
- No configurable privacy/consent UI (COMM-17).
- Web Push does not provide reliable device delivery confirmation.
