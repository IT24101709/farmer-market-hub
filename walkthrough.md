# Farmers Market Hub - Recent Feature Implementations

This document summarizes the changes made to implement the extended functional requirements for the Admin Panel, Farmer Stock features, the Public Landing Page, and the High-Marks Non-Functional Requirements.

## High-Marks Non-Functional Requirements Added

### 1. Security
- **JWT Refresh Tokens**: Implemented `generateAccessToken` (15m) and `generateRefreshToken` (7d) in the backend. Added a `/api/auth/refresh` route. Updated the React Native `AuthContext` to securely store both tokens in `AsyncStorage` and seamlessly use the access token.
- **Rate Limiting**: Added `express-rate-limit` to the backend `server.js` (max 100 requests / 15 minutes) to prevent abuse and brute force attacks.
- **Sanitization & Headers**: Installed and configured `helmet`, `xss-clean`, and `express-mongo-sanitize` to actively strip malicious NoSQL queries and secure HTTP headers.

### 2. Performance
- **Read Optimizations**: Appended Mongoose's `.lean()` method to read-heavy controller operations (`getProducts`, `getMyStocks`, `getPublicProducts`) to return raw JSON instead of heavy Mongoose documents, reducing API response times.
- **Pagination**: 
  - Backend: Updated `getMyStocks` to accept `page` and `limit` queries, returning paginated data and total page counts.
  - Frontend: Replaced the static stock list in `StockListScreen.js` with a `FlatList` that implements `onEndReached` for infinite scrolling functionality.
- **Image Compression**: Updated `expo-image-picker` configuration in `AddStockScreen.js` to lower quality from `0.8` to `0.5`, heavily compressing images prior to upload.

### 3. Reliability & Data Integrity
- **Database Indexing**: Added a compound index to the `Stock.js` model (`{ farmerId: 1, vegetableName: 1, status: 1 }`) to severely drastically queries.
- **Automated Rules**: Configured `updateStock` to automatically flip a stock's `status` to `Out of Stock` and `visibility` to `false` if an edit operation drops its `quantity` to `0`. 
- **Audit Logging**: 
  - Created a new MongoDB model: `StockHistory.js`.
  - Added hooks in `createStock`, `updateStock`, and `deleteStock` to automatically record an audit log (action type, user ID, and diffs) into `StockHistory` whenever stock is mutated.

### 4. Usability
- **Offline-First Mode**: Imported `@react-native-async-storage/async-storage` into `StockListScreen.js`. It now caches the user's fetched list to disk. On the next load, the UI immediately populates with cached data before silently refetching from the server.
- **Form Auto-Save**: In `AddStockScreen.js`, the app continuously caches the current draft (vegetable name, quantity, price, expiry, category) to local storage. If the user accidentally closes the app, their form is seamlessly restored on the next visit. It clears the cache only upon a successful submission.
- **Confirmation Modals**: Verified that `StockDetailScreen.js` correctly triggers an `Alert.alert` with a destructive confirmation warning before allowing a Farmer to delete their stock.

### 5. Deployment & DevOps
- **Centralized Environment Config**: Created a unified `frontend/src/config.js` to manage the `API_URL` dynamically based on the environment (e.g., Development vs Production). Updated all frontend Axios services to import this config instead of hardcoded localhost values.
- **Render Blueprint**: Created `backend/render.yaml` containing the exact infrastructure-as-code configuration required to spin up the backend as a Node Web Service on Render.com, safely isolating secrets like `MONGO_URI`.

---

## Changes Made (Previous Session)

### 1. Public Landing Page (New)
- **Architecture & Navigation**: The app now opens directly to a beautifully styled `LandingScreen.js` instead of the Login page. It resides in the `AuthStack`.
- **Real-Time Data Fetching**: Added a public API endpoint: `GET /api/market/public` to fetch the top 6 approved products.

### 2. Admin Dashboard Enhancements
- **System-Wide Summary**: The `AdminDashboardScreen.js` now dynamically fetches and displays the total number of active farmers, total stock quantity, and total value.

### 3. Farmer Management & Category Management
- **`ManageFarmersScreen.js`**: Created a centralized list view for the admin to see all farmers and suspend/activate accounts.
- **`Stock` Model Update**: Added `categoryId` reference. `AddStockScreen` & `BulkOperationsScreen` now dynamically fetch category chips.
