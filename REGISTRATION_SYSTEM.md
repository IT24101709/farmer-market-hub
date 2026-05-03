# Farmers Market Hub - User Registration & Farmer Approval System

## System Architecture

### User Roles
1. **Admin** - Manages farmer approvals (only one admin in system)
2. **Farmer** - Sells produce (requires admin approval before first login)
3. **Customer** - Buys produce (instant access after registration)

---

## Backend Changes

### 1. **User Model** (`backend/models/User.js`)
- ✅ Added `isApproved` field - defaults to `false` for Farmers, `true` for others
- ✅ Added `profileDetails.businessName` - for farmer business name
- ✅ Updated schema structure with better organization

### 2. **Authentication Controller** (`backend/controllers/authController.js`)
**New Endpoints:**
- `POST /api/auth/register` - Updated with approval logic
  - Farmers get no token until approved
  - Returns message: "Please wait for admin approval"
  - Customers get instant token

- `POST /api/auth/login` - Updated with approval check
  - Returns 403 error if farmer not approved
  - Message: "Your account is pending admin approval"

**New Admin Functions:**
- `GET /api/auth/admin/pending-farmers` - List all farmers awaiting approval
- `POST /api/auth/admin/approve-farmer/:farmerId` - Admin approves a farmer
- `POST /api/auth/admin/reject-farmer/:farmerId` - Admin rejects a farmer application

### 3. **Authentication Routes** (`backend/routes/authRoutes.js`)
Added admin routes:
```
GET    /api/auth/admin/pending-farmers        (Protected - Admin only)
POST   /api/auth/admin/approve-farmer/:id     (Protected - Admin only)
POST   /api/auth/admin/reject-farmer/:id      (Protected - Admin only)
```

---

## Frontend Changes

### 1. **Enhanced Registration Screen** (`frontend/src/screens/auth/RegisterScreen.js`)
**Features:**
- ✅ Role selection with visual cards (Customer 🛒 / Farmer 🚜)
- ✅ Customer-specific form (name, email, password)
- ✅ Farmer-specific form (+ business name, phone number)
- ✅ Password confirmation validation
- ✅ Success screen with different messages:
  - **Farmers:** Shows "PENDING APPROVAL" badge with waiting instructions
  - **Customers:** Shows "✓ APPROVED" badge with ready-to-use message
- ✅ Form validation with helpful error messages
- ✅ Professional UI with green theme

### 2. **Enhanced Login Screen** (`frontend/src/screens/auth/LoginScreen.js`)
**Features:**
- ✅ Professional branding with emoji (🌾)
- ✅ Helpful info box about registration types
- ✅ Special modal for "Account Approval Pending"
  - Shows when farmer tries to login before approval
  - Explains 24-48 hour approval window
  - Tips for checking email
- ✅ Better error handling with specific messages
- ✅ Improved UI/UX with better spacing and styling

### 3. **Updated Auth Context** (`frontend/src/context/AuthContext.js`)
**Changes:**
- ✅ Modified `register()` function to handle farmer approval
- ✅ For farmers not approved: stores user data but NOT token
- ✅ For customers/approved: stores both token and user data
- ✅ Proper error handling and async storage management

### 4. **New Admin Dashboard Screen** (`frontend/src/screens/admin/FarmerApprovalScreen.js`)
**Features:**
- ✅ List all pending farmers with:
  - Name, email, registration date
  - PENDING badge
  - Farmer details
- ✅ Approve button - instantly approves with token generation
- ✅ Reject button with modal:
  - Ask for rejection reason
  - Delete farmer account on rejection
  - Send notification
- ✅ Pull-to-refresh to update list
- ✅ Empty state when all farmers approved
- ✅ Loading states and error handling
- ✅ Counter badge showing pending count

---

## User Flow Diagrams

### Customer Registration Flow
```
Customer clicks Register
    ↓
Selects "Customer" role
    ↓
Fills: name, email, password
    ↓
Account created instantly
    ↓
Token generated → User logged in
    ↓
Success screen → Home page
```

### Farmer Registration Flow
```
Farmer clicks Register
    ↓
Selects "Farmer" role
    ↓
Fills: name, email, password, business name, phone
    ↓
Account created (isApproved: false)
    ↓
NO token generated
    ↓
Success screen: "Awaiting Admin Approval"
    ↓
Farmer can try login but gets rejection
```

### Farmer Approval Flow
```
Admin views FarmerApprovalScreen
    ↓
Sees list of pending farmers
    ↓
Can:
   a) Click Approve → Farmer isApproved: true
   b) Click Reject → Enter reason → Delete account
    ↓
Farmer notified via email
    ↓
Can now login successfully
```

---

## API Response Examples

### Registration - Customer Success
```json
{
  "_id": "123",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "Customer",
  "isApproved": true,
  "token": "eyJhbGc..."
}
```

### Registration - Farmer Awaiting Approval
```json
{
  "_id": "456",
  "name": "Jane Smith",
  "email": "jane@example.com",
  "role": "Farmer",
  "isApproved": false,
  "message": "Registration successful! Please wait for admin approval before you can login."
}
```

### Login - Farmer Not Approved
```json
{
  "message": "Your account is pending admin approval. You will be able to login once approved.",
  "role": "Farmer",
  "isApproved": false
}
Status: 403 Forbidden
```

---

## Testing Checklist

### Backend Testing
- [ ] Register customer → gets token immediately
- [ ] Register farmer → no token returned
- [ ] Customer login → success
- [ ] Farmer login (not approved) → 403 error
- [ ] Admin approve farmer → farmer.isApproved = true
- [ ] Admin reject farmer → farmer deleted from DB
- [ ] Farmer login (approved) → success

### Frontend Testing
- [ ] Registration screen shows role selection
- [ ] Farmer form shows business name & phone
- [ ] Customer registration success → can login
- [ ] Farmer registration success → approval screen shown
- [ ] Farmer login before approval → modal shown
- [ ] Admin dashboard loads pending farmers
- [ ] Admin approve/reject buttons work
- [ ] All error messages display correctly

---

## Configuration

### Environment Variables Needed
```
MONGO_URI=<your-mongodb-connection>
JWT_SECRET=<your-jwt-secret>
PORT=5000
```

### API Base URLs
- **Android Emulator:** `http://10.0.2.2:5000`
- **iOS Simulator:** `http://localhost:5000`
- **Physical Device:** `http://<your-machine-ip>:5000`

---

## Future Enhancements

1. **Email Notifications**
   - Send approval confirmation email to farmer
   - Send rejection email with reason

2. **Admin Dashboard Statistics**
   - Total farmers approved/pending
   - Registration trends
   - Approval metrics

3. **Farmer Profile Management**
   - View/edit business details
   - Upload business documents
   - View approval status

4. **DeliveryAgent Support**
   - Add DeliveryAgent registration flow
   - Admin approval for delivery agents

5. **Two-Factor Authentication**
   - OTP verification
   - Email verification

---

## File Structure Summary
```
backend/
├── controllers/
│   └── authController.js      (Updated with admin functions)
├── models/
│   └── User.js                 (Added isApproved field)
└── routes/
    └── authRoutes.js           (Added admin routes)

frontend/
└── src/
    ├── screens/
    │   ├── auth/
    │   │   ├── RegisterScreen.js      (Enhanced)
    │   │   └── LoginScreen.js         (Enhanced)
    │   └── admin/
    │       └── FarmerApprovalScreen.js (NEW)
    └── context/
        └── AuthContext.js             (Updated)
```

---

## Support

For issues or questions about the registration system:
1. Check console logs for detailed error messages
2. Verify MongoDB connection string
3. Ensure all environment variables are set
4. Test with Postman for API endpoints
5. Check network connectivity in emulator/device
