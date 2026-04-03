# Auth Flow & Permission Matrix

## Auth Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/auth/register` | Public | Register customer account |
| POST | `/api/v1/auth/login` | Public | Login, returns JWT + refresh token |
| POST | `/api/v1/auth/refresh` | Public | Rotate refresh token, issue new pair |
| POST | `/api/v1/auth/logout` | JWT | Revoke refresh token |
| GET | `/api/v1/auth/me` | JWT | Get current user profile |
| PATCH | `/api/v1/auth/me` | JWT | Update profile fields |

## Auth Flows

### Register
```
Client → POST /auth/register {email, password, firstName, lastName}
  → Validate DTO (email format, password 8+ chars with upper/lower/digit)
  → Check email uniqueness
  → bcrypt hash password (12 rounds)
  → Create user with role=customer
  → Generate JWT (15min) + refresh token (7d)
  → Return {accessToken, refreshToken, user}
```

### Login
```
Client → POST /auth/login {email, password}
  → Passport LocalStrategy validates credentials
  → Check user.isActive
  → bcrypt compare password
  → Update lastLoginAt
  → Resolve vendorId (for vendor users)
  → Generate JWT + refresh token
  → Return {accessToken, refreshToken, user}
```

### Refresh
```
Client → POST /auth/refresh {refreshToken}
  → SHA-256 hash the raw token
  → Lookup by hash in refresh_tokens table (indexed)
  → Verify not expired, not revoked
  → Revoke old token (rotation)
  → Load user, check isActive
  → Generate new JWT + refresh token
  → Return {accessToken, refreshToken, user}
```

### Logout
```
Client → POST /auth/logout {refreshToken}
  (requires Authorization: Bearer <jwt>)
  → SHA-256 hash the raw token
  → Find and revoke the matching refresh token
  → Return success (idempotent — no error if token not found)
```

## JWT Claims

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "customer",
  "vendorId": "vendor-uuid-or-undefined",
  "iat": 1234567890,
  "exp": 1234568790
}
```

## Token Lifecycle

| Token | Storage | TTL | Security |
|-------|---------|-----|----------|
| Access (JWT) | Client-side only | 15 min | Stateless, signed with HS256 |
| Refresh | SHA-256 hash in `refresh_tokens` table | 7 days | Rotated on each use, revocable |

## Password Policy

- Minimum 8 characters
- Must contain at least one uppercase letter, one lowercase letter, and one digit
- Hashed with bcrypt (12 salt rounds)

## Roles (7)

| Role | Value | Scope |
|------|-------|-------|
| Super Admin | `super_admin` | Full platform access |
| Admin | `admin` | Manage users, moderate content, manage orders, analytics |
| Moderator | `moderator` | Moderate products, reviews, offers |
| Ops | `ops` | View orders, manage shipments, analytics |
| Vendor | `vendor` | Full access to own vendor data |
| Vendor Staff | `vendor_staff` | Scoped access per `vendor_staff.permissions[]` |
| Customer | `customer` | Browse, buy, review eligible items |

## Permission Matrix

| Operation | super_admin | admin | moderator | ops | vendor | vendor_staff | customer |
|-----------|:-----------:|:-----:|:---------:|:---:|:------:|:------------:|:--------:|
| Manage platform settings | Y | — | — | — | — | — | — |
| Manage admins/users | Y | Y | — | — | — | — | — |
| Approve/reject vendors | Y | Y | — | — | — | — | — |
| Approve/reject products | Y | Y | Y | — | — | — | — |
| Moderate reviews | Y | Y | Y | — | — | — | — |
| View all orders | Y | Y | — | Y | — | — | — |
| Manage shipments | Y | Y | — | Y | — | — | — |
| View analytics | Y | Y | — | Y | — | — | — |
| Issue refunds | Y | Y | — | — | — | — | — |
| Create/edit own products | — | — | — | — | Y | Y* | — |
| Manage own offers | — | — | — | — | Y | Y* | — |
| View own vendor orders | — | — | — | — | Y | Y* | — |
| Manage vendor staff | — | — | — | — | Y | — | — |
| Browse catalog | Y | Y | Y | Y | Y | Y | Y |
| Place order | — | — | — | — | — | — | Y |
| Submit review | — | — | — | — | — | — | Y |
| Manage own profile | Y | Y | Y | Y | Y | Y | Y |

*Vendor staff access is scoped by the `permissions` JSON array on the `vendor_staff` record.

## Guard Execution Order

All routes require JWT authentication by default. Opt out with `@Public()`.

```
Request
  │
  ├─ JwtAuthGuard (APP_GUARD, runs first)
  │   ├─ @Public() → skip JWT validation, allow through
  │   └─ No @Public() → validate JWT, attach user to request
  │
  ├─ RolesGuard (APP_GUARD, runs second)
  │   ├─ No @Roles() → allow through
  │   └─ @Roles(ADMIN, MODERATOR) → check user.role ∈ required roles
  │
  └─ VendorOwnerGuard (per-route, applied with @UseGuards)
      ├─ super_admin/admin → bypass
      ├─ No vendorId in request → pass through
      └─ user.vendorId must match request vendorId
```

## Dev Seed Users

All passwords: `Password123!`

| Email | Role |
|-------|------|
| superadmin@ecommerce.local | super_admin |
| admin@ecommerce.local | admin |
| moderator@ecommerce.local | moderator |
| ops@ecommerce.local | ops |
| vendor1@ecommerce.local | vendor |
| vendor2@ecommerce.local | vendor |
| customer1@ecommerce.local | customer |
| customer2@ecommerce.local | customer |
| customer3@ecommerce.local | customer |

## File Locations

```
apps/api/src/
├── common/
│   ├── decorators/
│   │   ├── current-user.decorator.ts   # @CurrentUser() + JwtPayload interface
│   │   ├── public.decorator.ts         # @Public()
│   │   └── roles.decorator.ts          # @Roles()
│   └── guards/
│       ├── jwt-auth.guard.ts           # Global JWT guard (APP_GUARD)
│       ├── roles.guard.ts              # Global roles guard (APP_GUARD)
│       └── vendor-owner.guard.ts       # Per-route vendor isolation
└── modules/identity/
    ├── controllers/auth.controller.ts  # Auth REST endpoints
    ├── dto/                            # Request/response DTOs
    ├── entities/                       # User, Vendor, VendorStaff, RefreshToken
    ├── services/
    │   ├── auth.service.ts             # Core auth logic
    │   └── users.service.ts            # User repository wrapper
    └── strategies/
        ├── jwt.strategy.ts             # Passport JWT strategy
        └── local.strategy.ts           # Passport local strategy
```
