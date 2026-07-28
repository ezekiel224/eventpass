# Admin accounts and permission administration

## Architecture

Authorization is database-backed and evaluated on every protected request.

- `User` stores identity, password state, activation state, and the legacy `role` value retained only for migration compatibility.
- `Role` represents a named collection of capabilities.
- `Permission` uses scoped slugs such as `users:create`.
- `UserRole` and `RolePermission` are explicit many-to-many join tables.
- `UserPermissionOverride` stores direct allow or deny decisions.
- `AuditLog` records privileged mutations with actor, target, timestamp, IP address, user agent, and JSON metadata.

Effective access is calculated as:

1. Union every permission granted by every assigned role.
2. Apply direct user overrides.
3. Explicit deny overrides remove a permission and take precedence over all roles.

The idempotent seed creates:

- **Admin** — all permissions.
- **Moderator** — dashboard, events, attendees, passes, check-ins, and raffles.
- **User** — dashboard access only.

System roles and permissions are visible but immutable. Custom roles and permissions remain editable.

## Security controls

- Passwords use bcrypt with work factor 12.
- New accounts always receive `mustChangePassword = true`.
- Temporary passwords are generated with `crypto.getRandomValues()` and returned once.
- Login accepts email or username and returns a generic invalid-credentials response.
- Disabled accounts are rejected even when an older signed session cookie exists.
- Permission changes take effect immediately because authorization is resolved from the database per request.
- The proxy rejects unsafe cross-site API requests using Origin and Fetch Metadata validation.
- Sensitive account, role, permission, and password APIs additionally require a double-submit CSRF token.
- Zod strict schemas reject unknown or malformed fields.
- Users cannot edit their own role assignments, overrides, or active state.
- System roles and system permissions cannot be modified.
- API authorization failures return `401` for missing authentication and `403` for missing permission.
- Page authorization produces a real `403` using Next.js authorization interrupts.
- Administrative mutations are committed in the same database transaction as their audit record.

## Routes

### Pages

- `/admin/settings/accounts`
- `/admin/settings/permissions`
- `/change-password`

### APIs

- `GET /api/admin/users`
- `POST /api/admin/users`
- `PUT /api/admin/users`
- `GET /api/admin/roles`
- `PUT /api/admin/roles`
- `GET /api/admin/permissions`
- `PUT /api/admin/permissions`
- `GET /api/admin/audit`
- `GET /api/auth/csrf`
- `POST /api/auth/change-password`

Unsafe admin requests must send the `eventpass_csrf` cookie value in the `x-csrf-token` header.

## Deployment

Apply and seed the schema before enabling account administration:

```bash
npm run prisma:push
npm run prisma:seed
```

The seed is idempotent and attaches the pre-existing admin account to the full-access Admin role. Docker startup already runs `prisma db push` and the seed unless `SKIP_SEED=true`. Do not use `SKIP_SEED=true` for the first RBAC deployment.

Use a long random `AUTH_SECRET`, HTTPS, and secure production cookies. Back up the SQLite volume before applying schema changes.

## Verification checklist

1. Unauthenticated admin API requests return `401`.
2. Authenticated accounts without the required permission receive `403`.
3. Cross-site unsafe requests and mutations without a valid CSRF token receive `403`.
4. A newly created account is redirected to `/change-password`.
5. The temporary password is never stored in plaintext or returned again.
6. Role and override changes take effect on the next request.
7. Account, role, permission, and password changes create audit records.
8. The final active full-access administrator cannot accidentally alter their own access.
