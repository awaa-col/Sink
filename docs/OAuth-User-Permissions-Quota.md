# OAuth Authentication, User Permissions, and Quota System

This document describes the OAuth authentication, user permissions system, link statistics, and KV quota management features added to Sink.

## Features Overview

### 1. OAuth User Authentication

- GitHub OAuth 2.0 integration (compatible with Cloudflare Workers)
- JWT-based token authentication using the `jose` library
- Secure token storage and validation
- User information stored in Cloudflare KV
- Backward compatible with legacy site token authentication

### 2. User Roles and Permissions

- **Admin Role**: Full access to all features, can view all statistics
- **User Role**: Can only manage their own links
- Admin users configured via `NUXT_ADMIN_EMAILS` environment variable
- Ownership validation on all link operations (edit, delete, view)

### 3. Link Usage Statistics

Each link tracks:

- **totalClicks**: Total clicks since creation
- **todayClicks**: Clicks today (resets at UTC 00:00)
- **lastClickDate**: Last click date for tracking daily resets
- Statistics displayed in link list and detail views
- Automatically updated on each short link access

### 4. Admin Dashboard

Accessible only to admin users, displays:

- **Overview Statistics**: Total users, total links, today's active users, today's new links
- **Domain Rankings**: Top 50 most-linked domains
- **Quota Usage**: Real-time KV operation quota tracking with visual progress bars
- Color-coded alerts when approaching quota limits

### 5. KV Quota Hard Limits

- **Daily Read Limit**: 90,000 operations (configurable)
- **Daily Write Limit**: 910 operations (configurable)
- Returns HTTP 429 (Too Many Requests) when quota exceeded
- Automatic daily reset at UTC 00:00
- All KV operations tracked (link creation, updates, deletes, queries)
- Real-time quota monitoring in admin dashboard

## Environment Variables

Add these to your `.env` file or Cloudflare environment:

```bash
# OAuth Configuration
NUXT_GITHUB_CLIENT_ID=your_github_oauth_client_id
NUXT_GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
NUXT_GITHUB_REDIRECT_URI=https://your-domain.com/api/auth/oauth/callback
NUXT_JWT_SECRET=your_random_jwt_secret_key_here

# Admin Configuration (comma-separated list of admin emails)
NUXT_ADMIN_EMAILS=admin@example.com,admin2@example.com

# Quota Configuration
NUXT_QUOTA_ENABLED=true
NUXT_QUOTA_DAILY_READS=90000
NUXT_QUOTA_DAILY_WRITES=910
```

## Setting Up GitHub OAuth

### 1. Create GitHub OAuth App

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in the application details:
   - **Application name**: Your App Name (e.g., "Sink URL Shortener")
   - **Homepage URL**: Your domain (e.g., `https://sink.example.com`)
   - **Authorization callback URL**: `https://sink.example.com/api/auth/oauth/callback`
4. Click "Register application"
5. Note your **Client ID**
6. Generate a new **Client Secret**

### 2. Configure Environment Variables

Set the following in your Cloudflare Pages/Workers environment:

- `NUXT_GITHUB_CLIENT_ID`: Your OAuth app's Client ID
- `NUXT_GITHUB_CLIENT_SECRET`: Your OAuth app's Client Secret
- `NUXT_GITHUB_REDIRECT_URI`: Your callback URL (must match OAuth app settings)
- `NUXT_JWT_SECRET`: A random secret string for JWT signing (use `openssl rand -hex 32`)

### 3. Configure Admin Emails

Set the `NUXT_ADMIN_EMAILS` environment variable with comma-separated email addresses:

```bash
NUXT_ADMIN_EMAILS=admin@example.com,manager@example.com
```

Users logging in with these emails will be granted admin role.

## API Endpoints

### Authentication

#### `GET /api/auth/oauth/authorize`

Redirects user to GitHub OAuth authorization page.

#### `GET /api/auth/oauth/callback`

Handles OAuth callback from GitHub, creates/updates user, generates JWT token.

**Query Parameters:**

- `code`: Authorization code from GitHub
- `state`: CSRF protection token

**Response:**

- Redirects to `/dashboard/oauth/callback?token=<jwt_token>` on success

#### `GET /api/auth/me`

Returns current authenticated user information.

**Headers:**

- `Authorization: Bearer <jwt_token>`

**Response:**

```json
{
  "id": "github:123456",
  "email": "user@example.com",
  "name": "John Doe",
  "avatar": "https://avatars.githubusercontent.com/u/123456",
  "role": "user"
}
```

#### `POST /api/auth/logout`

Logs out the current user (JWT tokens are stateless, so actual logout happens client-side).

### Admin Endpoints

All admin endpoints require admin role.

#### `GET /api/admin/stats/overview`

Get overall system statistics.

**Response:**

```json
{
  "totalUsers": 42,
  "totalLinks": 1337,
  "todayActiveUsers": 15,
  "todayNewLinks": 23
}
```

#### `GET /api/admin/stats/domains`

Get top 50 domains by link count.

**Response:**

```json
{
  "domains": [
    { "domain": "example.com", "count": 150 },
    { "domain": "github.com", "count": 98 }
  ],
  "total": 2
}
```

#### `GET /api/admin/stats/quota`

Get current quota usage.

**Response:**

```json
{
  "enabled": true,
  "date": "2025-11-04",
  "reads": {
    "used": 12500,
    "limit": 90000,
    "percentage": 14
  },
  "writes": {
    "used": 245,
    "limit": 910,
    "percentage": 27
  }
}
```

#### `GET /api/admin/users`

List all users with pagination.

**Query Parameters:**

- `limit`: Results per page (max 100, default 20)
- `cursor`: Pagination cursor

**Response:**

```json
{
  "users": [...],
  "list_complete": false,
  "cursor": "next_page_cursor"
}
```

### Updated Link Endpoints

#### `GET /api/link/list`

- Now filters links by user ownership (non-admin users only see their own links)
- Returns link statistics (totalClicks, todayClicks)

#### `GET /api/link/query?slug=<slug>`

- Validates user ownership (non-admin users can only query their own links)
- Returns link statistics

#### `POST /api/link/create`

- Automatically associates link with authenticated user
- Initializes statistics counters

#### `PUT /api/link/edit`

- Validates user ownership before allowing edits
- Preserves original statistics

#### `POST /api/link/delete`

- Validates user ownership before allowing deletion

## Frontend Pages

### `/dashboard/oauth/login`

OAuth login page with GitHub sign-in button and fallback to token login.

### `/dashboard/oauth/callback`

OAuth callback handler that stores JWT token and redirects to dashboard.

### `/dashboard/admin`

Admin dashboard displaying:

- Overview statistics cards
- Domain rankings table
- Quota usage with progress bars
- Color-coded warnings when approaching limits

## KV Data Structure

### User Data

```typescript
user:${userId} = {
  id: string,              // e.g., "github:123456"
  email: string,
  name: string,
  avatar: string,
  role: 'admin' | 'user',
  createdAt: number,       // Unix timestamp
  lastLogin: number        // Unix timestamp
}
```

### Link Data (Extended)

```typescript
link:${slug} = {
  ...existing_fields,
  userId: string,          // Creator's user ID
  stats: {
    totalClicks: number,
    todayClicks: number,
    lastClickDate: string  // YYYY-MM-DD
  }
}
```

### Daily Quota

```typescript
quota:${YYYY-MM-DD} = {
  reads: number,
  writes: number,
  date: string
}
```

## Security Considerations

- JWT tokens expire after 30 days
- OAuth state parameter prevents CSRF attacks
- All passwords and secrets stored in environment variables
- Tokens never logged or exposed in responses
- Admin APIs validate role on every request
- Legacy site token authentication still works for backward compatibility

## Quota Management

The quota system tracks all KV operations:

1. **Middleware Order:**
   - `0.quota.ts`: Checks quota before processing (highest priority)
   - `2.auth.ts`: Authenticates user
   - `9.quota-track.ts`: Records operation after processing

2. **Operation Types:**
   - **Reads**: GET requests (except auth/stats/admin endpoints)
   - **Writes**: POST, PUT, PATCH, DELETE requests

3. **Behavior:**
   - Returns HTTP 429 when quota exceeded
   - Quota resets daily at UTC 00:00
   - Read-only endpoints (stats, auth info) don't count against quota
   - Failed operations still count toward quota

## Troubleshooting

### OAuth Login Not Working

1. Verify GitHub OAuth app settings match your environment variables
2. Check that callback URL is correctly configured
3. Ensure `NUXT_JWT_SECRET` is set and consistent

### Not Seeing Admin Dashboard

1. Verify your email is in `NUXT_ADMIN_EMAILS`
2. Log out and log back in (role is assigned at login)
3. Check browser console for errors

### Quota Errors (429)

1. Check current quota usage in admin dashboard
2. Wait for daily reset at UTC 00:00
3. Adjust quota limits if needed (`NUXT_QUOTA_DAILY_READS`, `NUXT_QUOTA_DAILY_WRITES`)
4. Consider optimizing application to reduce KV operations

### Statistics Not Updating

1. Ensure links are being accessed (not just viewed in dashboard)
2. Check that middleware `1.redirect.ts` is working
3. Verify KV writes are not being blocked by quota

## Deployment Checklist

- [ ] Create GitHub OAuth application
- [ ] Set `NUXT_GITHUB_CLIENT_ID` in Cloudflare environment
- [ ] Set `NUXT_GITHUB_CLIENT_SECRET` in Cloudflare environment
- [ ] Set `NUXT_GITHUB_REDIRECT_URI` in Cloudflare environment
- [ ] Generate and set `NUXT_JWT_SECRET` in Cloudflare environment
- [ ] Configure `NUXT_ADMIN_EMAILS` with admin email addresses
- [ ] Set `NUXT_QUOTA_ENABLED=true` if using quota limits
- [ ] Deploy to Cloudflare Pages/Workers
- [ ] Test OAuth login flow
- [ ] Verify admin dashboard access
- [ ] Test link creation and statistics tracking
- [ ] Monitor quota usage

## Migration Notes

- Existing links without `userId` can still be accessed by all users
- Legacy token authentication continues to work
- Admins can manage all links regardless of ownership
- Statistics tracking starts from implementation date (no historical data)

## License

Same as the main Sink project.
