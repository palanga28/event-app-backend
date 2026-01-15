# Event App Backend — API Routes

Base URL (dev): `http://localhost:3000`

## Auth

### POST `/api/auth/register`
- **Auth**: Public
- **Body**
  - `name` (string, min 2)
  - `email` (string, email)
  - `password` (string, min 6)
- **Responses**
  - `201` user created
  - `409` email already used

### POST `/api/auth/login`
- **Auth**: Public
- **Body**
  - `email` (string, email)
  - `password` (string)
- **Response**
  - `200` `{ user, accessToken, refreshToken }`

### POST `/api/auth/refresh`
- **Auth**: Public
- **Body**
  - `refreshToken` (string)
- **Response**
  - `200` `{ accessToken, refreshToken }` (rotation)

### POST `/api/auth/logout`
- **Auth**: Public
- **Body**
  - `refreshToken` (string)
- **Response**
  - `200` `{ message }`

## Health

### GET `/health`
- **Auth**: Public
- **Response**: Always `200` with JSON:
  - `status`: `OK` or `DEGRADED`
  - `database.status`: `Connected` or `Error`

## Conventions

### Authorization header
For protected routes:
- **Header**: `Authorization: Bearer <accessToken>`

### Pagination
Some list endpoints accept:
- `limit` (number)
- `offset` (number)

## Events

### POST `/api/events`
- **Auth**: `user/moderator/admin`
- **Body**
  - `title` (string, min 3)
  - `description` (string, optional)
  - `startDate` (ISO string)
  - `endDate` (ISO string, must be after `startDate`)
  - `location` (string, optional)
  - `coverImage` (string, optional)
- **Notes**
  - Event is created with `status: published`

### GET `/api/events`
- **Auth**: Public
- **Query**
  - `limit`, `offset`
- **Returns**: published events with organizer info

### GET `/api/events/mine`
- **Auth**: `user/moderator/admin`
- **Returns**: events where `organizer_id = me`

### GET `/api/events/:id`
- **Auth**: Public for published events
- **Notes**
  - Non-published events require auth and role `admin/moderator` or ownership

### PUT `/api/events/:id`
- **Auth**: organizer only
- **Body**: accepts fields like `title`, `description`, `startDate`, `endDate`, `location`, `coverImage`, `status`

### DELETE `/api/events/:id`
- **Auth**: organizer only

## Reports (user-facing)

### POST `/api/reports`
- **Auth**: `user/moderator/admin`
- **Body**
  - `type` (`event` | `user`)
  - `targetId` (number)
  - `reason` (string, optional, max 1000)

## Moderator

### GET `/api/moderator/events/pending`
- **Auth**: `moderator/admin`
- **Returns**: events with `status=pending`

### PUT `/api/moderator/events/:id/approve`
- **Auth**: `moderator/admin`
- **Effect**: set event `status=published`

### PUT `/api/moderator/events/:id/reject`
- **Auth**: `moderator/admin`
- **Body**: `reason` (optional)
- **Effect**: set event `status=rejected`

### GET `/api/moderator/reports`
- **Auth**: `moderator/admin`
- **Query**
  - `limit`, `offset`
  - `status` (ex: `pending`, `resolved`)
  - `type` (`event` | `user`)

### PUT `/api/moderator/reports/:id/resolve`
- **Auth**: `moderator/admin`
- **Body**
  - `action` (`dismiss` | `remove` | `warn`)
  - `reason` (string, optional)
- **Notes**
  - If `action=remove` and report targets an event, event is set to `rejected`
  - Writes an entry into `AuditLogs`

### GET `/api/moderator/users/reported`
- **Auth**: `moderator/admin`
- **Returns**: users with count of pending `user` reports

### PUT `/api/moderator/users/:id/warn`
- **Auth**: `moderator/admin`
- **Body**
  - `message` (string, optional, max 1000)
- **Notes**
  - Stores a resolved `Reports` row (`type=user`, `resolved_action=warn`)
  - Writes an entry into `AuditLogs`

### GET `/api/moderator/stats`
- **Auth**: `moderator/admin`

### GET `/api/moderator/activity`
- **Auth**: `moderator/admin`
- **Returns**: last 25 resolved reports (light activity feed)

## Admin

### GET `/api/admin/stats`
- **Auth**: `admin`

### GET `/api/admin/users`
- **Auth**: `admin`

### PUT `/api/admin/users/:id/ban`
- **Auth**: `admin`
- **Effect**: revoke all active refresh tokens for target user

### GET `/api/admin/users/:id/sessions`
- **Auth**: `admin`

### GET `/api/admin/events`
- **Auth**: `admin`

### PUT `/api/admin/events/:id/feature`
- **Auth**: `admin`
- **Body**
  - `featured` (boolean)
- **Notes**
  - Updates `Events.featured`
  - Writes an entry into `AuditLogs`

### GET `/api/admin/reports`
- **Auth**: `admin`
- **Query**
  - `limit`, `offset`
  - `status` (ex: `pending`, `resolved`)
  - `type` (`event` | `user`)

### GET `/api/admin/logs`
- **Auth**: `admin`
- **Query**
  - `limit`, `offset`
  - `action` (ex: `event_featured`, `report_resolved`, `user_warned`)

## Users

### GET `/api/users/profile`
- **Auth**: `user/moderator/admin`

### PUT `/api/users/profile`
- **Auth**: `user/moderator/admin`
- **Body**: `name`/`email` optional

### PUT `/api/users/password`
- **Auth**: `user/moderator/admin`
- **Body**
  - `currentPassword`
  - `newPassword`

### GET `/api/users/all`
- **Auth**: `moderator/admin`
- **Query**
  - `limit`, `offset`
  - `nameLike` (string)
  - `emailLike` (string)

### GET `/api/users/:id`
- **Auth**: `moderator/admin`

### PUT `/api/users/:id/role`
- **Auth**: `admin`
- **Body**
  - `role` (`user` | `moderator` | `admin`)

## TicketTypes

### GET `/api/ticket-types`
- **Auth**: Public

### GET `/api/ticket-types/event/:eventId`
- **Auth**: Public

### GET `/api/ticket-types/:id`
- **Auth**: Public

### POST `/api/ticket-types`
- **Auth**: `user/moderator/admin`
- **Body**
  - `name`, `description`, `price`, `quantity`, `eventId`

### PUT `/api/ticket-types/:id`
- **Auth**: `user/moderator/admin`

### DELETE `/api/ticket-types/:id`
- **Auth**: `user/moderator/admin`

## Tickets

### GET `/api/tickets/user`
- **Auth**: `user/moderator/admin`

### GET `/api/tickets/:id`
- **Auth**: `user/moderator/admin` (owner or event organizer)

### POST `/api/tickets`
- **Auth**: `user/moderator/admin`
- **Body**
  - `ticketTypeId`
  - `quantity` (1..10)

### PUT `/api/tickets/:id/cancel`
- **Auth**: `user/moderator/admin` (owner)
