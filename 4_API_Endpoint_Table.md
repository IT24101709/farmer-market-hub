# API Endpoint Reference: Farmers Market Hub

## Base URL
```
Backend: http://localhost:5000/api
Production: https://farmers-market-hub-backend.onrender.com/api
```

---

## Authentication Routes (`/auth`)

| Method | Endpoint | Description | Auth Required | Request Body | Response | Status |
|--------|----------|-------------|---------------|--------------|----------|--------|
| POST | `/auth/register` | Register new user | No | `{name, email, password, role}` | User object with token | 201 |
| POST | `/auth/login` | User login | No | `{email, password}` | User object with JWT token | 200 |
| POST | `/auth/refresh` | Refresh JWT token | No | `{refreshToken}` | New access token | 200 |
| GET | `/auth/me` | Get current user profile | Yes (JWT) | - | User object | 200 |
| PUT | `/auth/profile` | Update user profile | Yes (JWT) | `{profileDetails}` | Updated user object | 200 |
| POST | `/auth/setup-admin` | Initial admin setup | No | `{name, email, password}` | Admin user created | 201 |
| GET | `/auth/admin/pending-farmers` | Get pending farmer approvals | Yes (Admin) | - | Array of pending farmers | 200 |
| POST | `/auth/admin/approve-farmer/:farmerId` | Approve farmer registration | Yes (Admin) | `{approvalNotes?}` | Approved farmer object | 200 |
| POST | `/auth/admin/reject-farmer/:farmerId` | Reject farmer registration | Yes (Admin) | `{rejectionReason}` | Rejection confirmation | 200 |

---

## Stock Routes (`/stock`)

| Method | Endpoint | Description | Auth Required | Request Body | Response | Status |
|--------|----------|-------------|---------------|--------------|----------|--------|
| GET | `/stock` | List all available stock | No | Query: `{category?, status?, farmerId?, page?, limit?}` | Array of stock items | 200 |
| GET | `/stock/search` | Search stock by name/category | No | Query: `{q, category?, farmerId?}` | Search results | 200 |
| GET | `/stock/:id` | Get stock details | No | - | Stock object | 200 |
| POST | `/stock` | Add new stock | Yes (Farmer) | `{name, category, quantity, unit, pricePerKg, harvestDate, imageUrl, description?, qualityGrade}` | Created stock object | 201 |
| PUT | `/stock/:id` | Update stock details | Yes (Farmer/Owner) | `{quantity?, price?, status?, description?}` | Updated stock object | 200 |
| DELETE | `/stock/:id` | Archive/delete stock | Yes (Farmer/Owner) | `{reason?, notes?}` | Deletion confirmation | 200 |
| GET | `/stock/farmer/:farmerId` | Get farmer's stock | Yes (Farmer) | - | Array of farmer's stock | 200 |
| POST | `/stock/:id/freeze` | Freeze stock from sale | Yes (Admin/Farmer) | `{reason, frozenUntil}` | Stock frozen confirmation | 200 |
| POST | `/stock/:id/unfreeze` | Unfreeze stock | Yes (Admin/Farmer) | - | Stock unfrozen confirmation | 200 |
| GET | `/stock/expiring/soon` | Get expiring stock items | Yes (Admin/Farmer) | - | Array of expiring items | 200 |

---

## Category Routes (`/category`)

| Method | Endpoint | Description | Auth Required | Request Body | Response | Status |
|--------|----------|-------------|---------------|--------------|----------|--------|
| GET | `/category` | Get all categories | No | - | Array of categories | 200 |
| GET | `/category/:id` | Get category details | No | - | Category object | 200 |
| POST | `/category` | Create new category | Yes (Admin) | `{name, description, imageUrl}` | Created category object | 201 |
| PUT | `/category/:id` | Update category | Yes (Admin) | `{name?, description?, imageUrl?, status?}` | Updated category object | 200 |
| DELETE | `/category/:id` | Delete category | Yes (Admin) | - | Deletion confirmation | 200 |

---

## Order Routes (`/order`)

| Method | Endpoint | Description | Auth Required | Request Body | Response | Status |
|--------|----------|-------------|---------------|--------------|----------|--------|
| POST | `/order` | Create new order | Yes (Customer) | `{items: [{stockId, quantity}], customerId}` | Created order object | 201 |
| GET | `/order` | Get orders (filtered by role) | Yes | Query: `{status?, customerId?, page?, limit?}` | Array of orders | 200 |
| GET | `/order/:id` | Get order details | Yes | - | Order object | 200 |
| PUT | `/order/:id/confirm` | Confirm/approve order | Yes (Farmer/Admin) | `{farmerConfirmed}` | Confirmed order object | 200 |
| PUT | `/order/:id/status` | Update order status | Yes (Admin/DeliveryAgent) | `{status, notes?}` | Updated order object | 200 |
| PUT | `/order/:id/cancel` | Cancel order | Yes (Customer/Admin) | `{reason}` | Cancelled order object | 200 |
| GET | `/order/customer/:customerId` | Get customer's orders | Yes | Query: `{status?, page?, limit?}` | Array of customer orders | 200 |
| GET | `/order/farmer/:farmerId` | Get farmer's orders | Yes | Query: `{status?, page?, limit?}` | Array of farmer orders | 200 |
| POST | `/order/:id/checkout` | Process order checkout | Yes (Customer) | `{paymentMethod}` | Checkout confirmation | 200 |
| GET | `/order/:id/history` | Get order status history | Yes | - | Array of status changes | 200 |

---

## Payment Routes (`/payment`)

| Method | Endpoint | Description | Auth Required | Request Body | Response | Status |
|--------|----------|-------------|---------------|--------------|----------|--------|
| POST | `/payment` | Create payment | Yes (Customer) | `{orderId, amount, paymentMethod}` | Payment object with transaction ID | 201 |
| GET | `/payment/:id` | Get payment details | Yes | - | Payment object | 200 |
| GET | `/payment/order/:orderId` | Get payment for order | Yes | - | Payment object | 200 |
| PUT | `/payment/:id/verify` | Verify payment status | Yes (Admin) | `{transactionId, status}` | Verified payment object | 200 |
| POST | `/payment/:id/refund` | Refund payment | Yes (Admin) | `{reason}` | Refund confirmation | 200 |
| GET | `/payment/status/:transactionId` | Check payment status | No | - | Payment status | 200 |

---

## Delivery Routes (`/delivery`)

| Method | Endpoint | Description | Auth Required | Request Body | Response | Status |
|--------|----------|-------------|---------------|--------------|----------|--------|
| POST | `/delivery` | Create delivery request | Yes (Admin) | `{orderId, agentId, estimatedTime}` | Delivery object | 201 |
| GET | `/delivery` | List deliveries | Yes | Query: `{status?, agentId?, page?, limit?}` | Array of deliveries | 200 |
| GET | `/delivery/:id` | Get delivery details | Yes | - | Delivery object | 200 |
| PUT | `/delivery/:id/assign` | Assign delivery agent | Yes (Admin) | `{agentId}` | Assigned delivery object | 200 |
| PUT | `/delivery/:id/start` | Mark delivery as in-transit | Yes (DeliveryAgent) | `{currentLocation}` | Updated delivery object | 200 |
| PUT | `/delivery/:id/complete` | Mark delivery as completed | Yes (DeliveryAgent) | `{completedAt, notes?, rating?}` | Completed delivery object | 200 |
| PUT | `/delivery/:id/failed` | Mark delivery as failed | Yes (DeliveryAgent/Admin) | `{failureReason}` | Failed delivery object | 200 |
| GET | `/delivery/agent/:agentId` | Get agent's deliveries | Yes | Query: `{status?, page?, limit?}` | Array of deliveries | 200 |
| GET | `/delivery/available-agents` | Get available delivery agents | Yes (Admin) | Query: `{location?, capacity?}` | Array of available agents | 200 |
| POST | `/delivery/:id/track` | Get real-time tracking | Yes | - | Live tracking data | 200 |

---

## Farmer Routes (`/farmer`)

| Method | Endpoint | Description | Auth Required | Request Body | Response | Status |
|--------|----------|-------------|---------------|--------------|----------|--------|
| GET | `/farmer` | Get all farmers | No | Query: `{status?, page?, limit?}` | Array of farmers | 200 |
| GET | `/farmer/:id` | Get farmer profile | No | - | Farmer object with stats | 200 |
| GET | `/farmer/:id/stock` | Get farmer's stock | No | Query: `{category?, status?}` | Array of farmer's stock | 200 |
| GET | `/farmer/:id/stats` | Get farmer statistics | Yes (Farmer/Admin) | - | Farmer stats object | 200 |
| GET | `/farmer/:id/reviews` | Get farmer reviews | No | Query: `{rating?, page?, limit?}` | Array of reviews | 200 |
| PUT | `/farmer/:id/update` | Update farmer profile | Yes (Farmer) | `{profileDetails}` | Updated farmer object | 200 |
| GET | `/farmer/:id/reports` | Get farmer reports | Yes (Farmer/Admin) | Query: `{type?, dateFrom?, dateTo?}` | Array of reports | 200 |

---

## Review Routes (`/review`)

| Method | Endpoint | Description | Auth Required | Request Body | Response | Status |
|--------|----------|-------------|---------------|--------------|----------|--------|
| POST | `/review` | Create review | Yes (Customer) | `{orderId, farmerId, rating, comment, reviewType}` | Created review object | 201 |
| GET | `/review/:id` | Get review details | No | - | Review object | 200 |
| GET | `/review/farmer/:farmerId` | Get farmer reviews | No | Query: `{rating?, page?, limit?}` | Array of reviews | 200 |
| GET | `/review/product/:stockId` | Get product reviews | No | Query: `{page?, limit?}` | Array of reviews | 200 |
| PUT | `/review/:id` | Update review | Yes (Reviewer) | `{rating?, comment?}` | Updated review object | 200 |
| DELETE | `/review/:id` | Delete review | Yes (Reviewer/Admin) | - | Deletion confirmation | 200 |
| POST | `/review/:id/helpful` | Mark review as helpful | Yes (Customer) | - | Updated review object | 200 |

---

## Admin Routes (`/admin`)

| Method | Endpoint | Description | Auth Required | Request Body | Response | Status |
|--------|----------|-------------|---------------|--------------|----------|--------|
| GET | `/admin/dashboard` | Get admin dashboard stats | Yes (Admin) | - | Dashboard data object | 200 |
| GET | `/admin/users` | List all users | Yes (Admin) | Query: `{role?, status?, page?, limit?}` | Array of users | 200 |
| PUT | `/admin/users/:id/status` | Update user status | Yes (Admin) | `{status, reason?}` | Updated user object | 200 |
| POST | `/admin/users/:id/suspend` | Suspend user | Yes (Admin) | `{suspendedUntil, reason}` | Suspended user object | 200 |
| POST | `/admin/users/:id/block` | Block user | Yes (Admin) | `{reason}` | Blocked user object | 200 |
| GET | `/admin/reports` | Get system reports | Yes (Admin) | Query: `{type?, dateFrom?, dateTo?}` | Array of reports | 200 |
| POST | `/admin/reports/generate` | Generate custom report | Yes (Admin) | `{reportType, filters, format}` | Report object | 201 |
| GET | `/admin/audit-logs` | View audit logs | Yes (Admin) | Query: `{userId?, action?, page?, limit?}` | Array of audit logs | 200 |
| GET | `/admin/disputes` | List disputes/complaints | Yes (Admin) | Query: `{status?, page?, limit?}` | Array of disputes | 200 |
| PUT | `/admin/disputes/:id/resolve` | Resolve dispute | Yes (Admin) | `{resolution, compensation?}` | Resolved dispute object | 200 |

---

## Notification Routes (`/notification`)

| Method | Endpoint | Description | Auth Required | Request Body | Response | Status |
|--------|----------|-------------|---------------|--------------|----------|--------|
| GET | `/notification` | Get user notifications | Yes | Query: `{isRead?, page?, limit?}` | Array of notifications | 200 |
| GET | `/notification/unread` | Get unread notifications | Yes | - | Unread notifications count | 200 |
| PUT | `/notification/:id/read` | Mark notification as read | Yes | - | Updated notification object | 200 |
| POST | `/notification/:id/read-all` | Mark all as read | Yes | - | Confirmation | 200 |
| DELETE | `/notification/:id` | Delete notification | Yes | - | Deletion confirmation | 200 |
| DELETE | `/notification/delete-all` | Delete all notifications | Yes | - | Deletion confirmation | 200 |

---

## Market Routes (`/market`)

| Method | Endpoint | Description | Auth Required | Request Body | Response | Status |
|--------|----------|-------------|---------------|--------------|----------|--------|
| GET | `/market/trending` | Get trending products | No | Query: `{limit?, category?}` | Array of trending items | 200 |
| GET | `/market/best-farmers` | Get top-rated farmers | No | Query: `{limit?}` | Array of top farmers | 200 |
| GET | `/market/seasonal` | Get seasonal products | No | Query: `{season?}` | Array of seasonal items | 200 |
| GET | `/market/statistics` | Get market statistics | No | - | Market stats object | 200 |

---

## Admin Delivery Routes (`/admin/delivery`)

| Method | Endpoint | Description | Auth Required | Request Body | Response | Status |
|--------|----------|-------------|---------------|--------------|----------|--------|
| GET | `/admin/delivery/agents` | Manage delivery agents | Yes (Admin) | Query: `{status?, capacity?, page?, limit?}` | Array of agents | 200 |
| GET | `/admin/delivery/agents/:id` | Get agent details | Yes (Admin) | - | Agent object | 200 |
| PUT | `/admin/delivery/agents/:id` | Update agent profile | Yes (Admin) | `{maxCapacityKg?, vehicleType?, serviceCities?}` | Updated agent object | 200 |
| POST | `/admin/delivery/agents/:id/activate` | Activate agent | Yes (Admin) | - | Activated agent object | 200 |
| POST | `/admin/delivery/agents/:id/deactivate` | Deactivate agent | Yes (Admin) | `{reason}` | Deactivated agent object | 200 |
| GET | `/admin/delivery/routes` | Optimize delivery routes | Yes (Admin) | - | Optimized routes | 200 |

---

## Report Routes (`/report`)

| Method | Endpoint | Description | Auth Required | Request Body | Response | Status |
|--------|----------|-------------|---------------|--------------|----------|--------|
| POST | `/report` | Create report | Yes (Farmer/Admin) | `{reportType, data, dateFrom?, dateTo?}` | Created report object | 201 |
| GET | `/report/:id` | Get report details | Yes | - | Report object | 200 |
| GET | `/report` | List user reports | Yes | Query: `{reportType?, page?, limit?}` | Array of reports | 200 |
| DELETE | `/report/:id` | Delete report | Yes (Admin) | - | Deletion confirmation | 200 |
| POST | `/report/:id/export` | Export report | Yes | Query: `{format: pdf|csv|excel}` | File download | 200 |

---

## Error Response Format

```json
{
  "success": false,
  "error": "Error message",
  "statusCode": 400,
  "details": "Additional error details (optional)"
}
```

## Success Response Format

```json
{
  "success": true,
  "data": { /* Response data */ },
  "message": "Success message (optional)"
}
```

---

## Authentication Header

All protected endpoints require:
```
Authorization: Bearer <JWT_TOKEN>
```

## Rate Limiting

- General endpoints: 100 requests/15 minutes per IP
- Auth endpoints: 5 requests/15 minutes per IP
- Payment endpoints: 10 requests/15 minutes per IP

## Response Status Codes

- **200**: OK
- **201**: Created
- **400**: Bad Request
- **401**: Unauthorized
- **403**: Forbidden
- **404**: Not Found
- **409**: Conflict
- **422**: Unprocessable Entity
- **429**: Too Many Requests
- **500**: Internal Server Error
