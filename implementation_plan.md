# Non-Functional Requirements Implementation Plan

This plan details how we will integrate the required high-marks non-functional features into the existing architecture, balancing security, performance, and usability.

## User Review Required

> [!IMPORTANT]
> - **JWT Refresh Tokens**: Implementing refresh token rotation requires storing the long-lived refresh token. In React Native, the best practice is to use `expo-secure-store`. I will add this dependency. Is this acceptable?
> - **Offline-First Storage**: I will use `@react-native-async-storage/async-storage` for caching stock lists and form drafts. I will install this if it's not already in the project.
> - **Hosting Setup**: I will set up the backend structure for Render/Railway deployment, but actual hosting requires you to create the accounts and link the repo. I will provide the exact steps and necessary configuration files (e.g., `render.yaml` or `Procfile`).

---

## 1. Security

### Backend Packages to Install
- `express-mongo-sanitize`: Prevents NoSQL injection by sanitizing inputs.
- `express-rate-limit`: Prevents brute-force and API abuse.
- `helmet` & `xss-clean`: General security headers and Cross-Site Scripting protection.
- `jsonwebtoken` (Update logic for Refresh Tokens).

### Proposed Changes
- **`server.js`**: Integrate rate limiting on `/api/stocks` and `/api/auth`, and add sanitization middleware.
- **`authController.js` & `authRoutes.js`**: 
  - Update login/registration to return both `accessToken` (short-lived, 15m) and `refreshToken` (long-lived, 7d).
  - Add a `/api/auth/refresh` endpoint to rotate tokens securely.
- **`authMiddleware.js`**: Ensure Role-Based Access Control accurately intercepts unauthorized access (already partially implemented, will audit for strictness).

---

## 2. Performance

### Proposed Changes
- **Backend DB Optimization**: Use `.lean()` in `marketController.js` and `stockController.js` for read-heavy queries to reduce memory overhead and achieve `< 300ms` response times.
- **Pagination (`stockController.js`)**: Update `getMyStocks` to accept `page` and `limit` query parameters.
- **Frontend Pagination (`StockListScreen.js`)**: Implement `FlatList` with `onEndReached` to support infinite scrolling / pagination for large lists.
- **Image Compression (`AddStockScreen.js`)**: Explicitly configure `expo-image-picker` to compress images aggressively before upload (`quality: 0.5` and `resize` dimensions).

---

## 3. Reliability & Data Integrity

### Proposed Changes
- **`Stock` Model Indexing (`Stock.js`)**: Add compound database indexes: `stockSchema.index({ farmerId: 1, vegetableName: 1, status: 1 });` to drastically speed up search and filtering queries.
- **Auto Status Update (`stockController.js`)**: Add logic ensuring that if an update payload reduces `quantity` to `0`, the system explicitly sets `status = 'Out of Stock'` and `visibility = false` (or removes it entirely if that was the assignment's rule).
- **`StockHistory` Model [NEW]**: Create `models/StockHistory.js`.
- **Audit Logging**: Intercept `create`, `update`, and `delete` operations in `stockController.js` to log a record into `StockHistory` (Who, What, When).

---

## 4. Usability

### Proposed Changes
- **Frontend Packages**: Ensure `@react-native-async-storage/async-storage` is available.
- **Offline-First (`StockListScreen.js`)**: 
  - On fetch success: Save the resulting array to AsyncStorage.
  - On mount/fetch failure: Load and display the array from AsyncStorage, showing an "Offline Mode" banner.
- **Form Auto-Save (`AddStockScreen.js`)**: 
  - Persist `vegetableName`, `quantity`, `pricePerKg` to AsyncStorage dynamically.
  - Hydrate the form on component mount. Clear the cache upon successful submission.
- **Confirmation Modals (`EditStockScreen.js` / `StockListScreen.js`)**: Verify that `Alert.alert` with destructive confirmation is present for all delete actions.

---

## 5. Deployment & DevOps

### Proposed Changes
- **API Base URL Configuration**: Create `frontend/src/config.js` to dynamically route API calls based on the environment (e.g., local network IP vs. production URL). Replace all hardcoded `http://localhost:5000` instances.
- **Environment Protection**: Ensure `.env` is comprehensively utilized in the backend and completely omitted via `.gitignore`.
- **Hosting Config files [NEW]**: Generate documentation and `render.yaml` (if applicable) detailing the steps to deploy the backend to Render and host the DB on MongoDB Atlas.

## Verification Plan
1. **Security**: Run an automated script to trigger Rate Limiting. Test token refresh logic by artificially expiring the access token.
2. **Performance**: Check network logs to verify smaller image sizes and paginated backend responses.
3. **Usability**: Turn off Wi-Fi on the simulator/device and verify `StockListScreen` still displays cached data.
4. **Data Integrity**: Update a stock to `0` quantity and verify the status flips to `Out of Stock` or is removed. Check the DB for `StockHistory` records.
