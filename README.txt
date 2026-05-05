================================================================================
                      FARMERS MARKET HUB - PROJECT README
================================================================================

Project Title: Farmers Market Hub
Version: 1.0.0
Date: May 2026
Current Status: Development

================================================================================
01. GITHUB REPOSITORY LINK
================================================================================

GitHub Repository: [Update with your repository URL]
Example: https://github.com/your-username/farmers-market-hub

Instructions:
- Replace the above with your actual GitHub repository link
- Ensure the repository is public and contains complete source code
- Repository should include:
  * Backend source code (Node.js/Express)
  * Frontend source code (React Native)
  * Documentation files
  * Configuration files (.env.example)
  * Database seeding scripts

================================================================================
02. TEAM DETAILS
================================================================================

Group Number: [Update with your group number]

Team Members and Responsibilities:

Member 1: [ID] - [Name] - [Module Assignment]
  - Module: Authentication & User Management
  - Responsibilities: User registration, login, profile management, role-based access

Member 2: [ID] - [Name] - [Module Assignment]
  - Module: Stock & Inventory Management
  - Responsibilities: Stock CRUD, categories, shelf-life management, archival

Member 3: [ID] - [Name] - [Module Assignment]
  - Module: Order Management
  - Responsibilities: Order creation, status workflow, confirmation system

Member 4: [ID] - [Name] - [Module Assignment]
  - Module: Delivery & Logistics
  - Responsibilities: Delivery assignment, agent management, tracking

Member 5: [ID] - [Name] - [Module Assignment]
  - Module: Payment & Reviews
  - Responsibilities: Payment processing, review/rating system, feedback management

Member 6: [ID] - [Name] - [Module Assignment]
  - Module: Admin Panel & Reporting
  - Responsibilities: Dashboard, user management, reports, audit logs

================================================================================
03. PROJECT OVERVIEW
================================================================================

Problem Statement:
The Farmers Market Hub addresses the challenge of inefficient agricultural marketing
by creating a direct marketplace connecting farmers with customers, integrating
delivery logistics, and providing transparent payment systems.

Key Features:
✓ Multi-role user system (Admin, Farmer, Customer, Delivery Agent)
✓ Real-time stock management with shelf-life tracking
✓ Integrated order management system
✓ Automated delivery assignment
✓ Secure payment processing
✓ Review and rating system
✓ Audit logging and reporting
✓ Mobile-first interface (React Native)
✓ RESTful API backend (Node.js/Express)
✓ MongoDB database

Target Users:
- Farmers: Direct market access without intermediaries
- Customers: Fresh produce with transparent sourcing
- Delivery Agents: Consistent work opportunities
- Administrators: Platform oversight and quality control

================================================================================
04. TECHNOLOGY STACK
================================================================================

Backend:
- Framework: Node.js (v18+) with Express.js
- Database: MongoDB (Atlas or local)
- Authentication: JWT (JSON Web Tokens)
- Password Security: bcryptjs
- Validation: express-mongo-sanitize, helmet.js
- File Upload: Multer
- Scheduling: node-cron
- Rate Limiting: express-rate-limit

Frontend:
- Framework: React Native with Expo
- State Management: React Context API
- Navigation: React Navigation
- Styling: Custom theme (Green theme applied)
- HTTP Client: Axios

Development Tools:
- Package Manager: npm
- Version Control: Git
- Environment: .env configuration
- Server Restart: nodemon
- Testing: Jest (optional)

================================================================================
05. PROJECT STRUCTURE
================================================================================

farmers-market-hub/
├── backend/
│   ├── controllers/        # Business logic handlers
│   │   ├── adminController.js
│   │   ├── authController.js
│   │   ├── stockController.js
│   │   ├── orderController.js
│   │   ├── deliveryController.js
│   │   ├── paymentController.js
│   │   ├── reviewController.js
│   │   └── ...
│   │
│   ├── models/            # MongoDB schemas
│   │   ├── User.js
│   │   ├── Stock.js
│   │   ├── Order.js
│   │   ├── Payment.js
│   │   ├── Delivery.js
│   │   ├── Review.js
│   │   └── ...
│   │
│   ├── routes/            # API route definitions
│   │   ├── authRoutes.js
│   │   ├── stockRoutes.js
│   │   ├── orderRoutes.js
│   │   ├── deliveryRoutes.js
│   │   └── ...
│   │
│   ├── middleware/        # Express middleware
│   │   ├── authMiddleware.js
│   │   ├── errorHandler.js
│   │   ├── uploadMiddleware.js
│   │   └── stockValidation.js
│   │
│   ├── utils/             # Utility functions
│   │   ├── counter.js
│   │   ├── cron.js
│   │   ├── orderNotifications.js
│   │   └── ...
│   │
│   ├── jobs/              # Cron jobs
│   │   └── syncExpiredListings.js
│   │
│   ├── uploads/           # Uploaded files storage
│   │
│   ├── app.js             # Express app configuration
│   ├── server.js          # Server entry point
│   ├── package.json       # Dependencies
│   └── .env              # Environment variables (add locally)
│
├── frontend/
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── screens/       # Screen components by module
│   │   │   ├── auth/
│   │   │   ├── customer/
│   │   │   ├── farmer/
│   │   │   ├── delivery/
│   │   │   ├── admin/
│   │   │   ├── orders/
│   │   │   └── ...
│   │   │
│   │   ├── context/       # React Context API
│   │   │   ├── AuthContext.js
│   │   │   ├── CartContext.js
│   │   │   └── NotificationContext.js
│   │   │
│   │   ├── services/      # API service calls
│   │   ├── navigation/    # Navigation structure
│   │   ├── utils/         # Helper utilities
│   │   ├── theme/         # Theming
│   │   └── config.js      # Configuration
│   │
│   ├── assets/            # Images, fonts
│   ├── App.js            # Root app component
│   ├── app.json          # Expo configuration
│   └── package.json      # Dependencies

================================================================================
06. DEPLOYMENT DETAILS
================================================================================

Backend URL: [Update with your backend deployment URL]
Example: https://farmers-market-hub-backend.onrender.com

Frontend URL: [Update with your frontend deployment URL]
Example: https://farmers-market-hub-frontend.vercel.com (or Expo hosted)

Deployment Platform: Render (Backend) / Vercel or Expo (Frontend)

Environment Setup:
1. Create .env file in backend directory with:
   - MONGODB_URI: MongoDB connection string
   - JWT_SECRET: Secret key for JWT signing
   - JWT_EXPIRE: JWT expiration time
   - CLIENT_ORIGIN: Frontend URL
   - PORT: Server port (default 5000)

2. Create .env.local file in frontend with:
   - REACT_APP_API_BASE_URL: Backend API URL
   - REACT_APP_ENV: Environment (development/production)

Deployment Steps:
1. Backend: Push to Render (connected to GitHub)
2. Frontend: Build and deploy to Expo/Vercel
3. Database: Use MongoDB Atlas for cloud database
4. Environment Variables: Configure in platform settings

================================================================================
07. KEY API ENDPOINTS
================================================================================

Authentication:
- POST /api/auth/register          - User registration
- POST /api/auth/login             - User login
- GET  /api/auth/me                - Get current user

Stock Management:
- GET  /api/stock                  - List all stock
- POST /api/stock                  - Add new stock
- PUT  /api/stock/:id              - Update stock
- DELETE /api/stock/:id            - Delete stock

Orders:
- POST /api/order                  - Create order
- GET  /api/order/:id              - Get order details
- PUT  /api/order/:id/status       - Update order status

Delivery:
- GET  /api/delivery               - List deliveries
- PUT  /api/delivery/:id/assign    - Assign delivery agent
- PUT  /api/delivery/:id/complete  - Complete delivery

Payments:
- POST /api/payment                - Create payment
- GET  /api/payment/:id            - Get payment details

Reviews:
- POST /api/review                 - Create review
- GET  /api/review/farmer/:id      - Get farmer reviews

Admin:
- GET  /api/admin/dashboard        - Admin dashboard
- GET  /api/admin/users            - Manage users
- GET  /api/admin/reports          - Generate reports

(Refer to 4_API_Endpoint_Table.md for complete API documentation)

================================================================================
08. DATABASE SCHEMA
================================================================================

Collections:
✓ Users          - User accounts and profiles
✓ Stock          - Product inventory
✓ StockHistory   - Stock change history
✓ Orders         - Customer orders
✓ Payments       - Payment transactions
✓ Deliveries     - Delivery records
✓ Reviews        - User reviews and ratings
✓ Notifications  - User notifications
✓ Categories     - Product categories
✓ AuditLogs      - System audit trail
✓ Reports        - Generated reports

(Refer to 3_Database_Schema_Diagram.md for detailed schema)

================================================================================
09. SYSTEM ARCHITECTURE
================================================================================

Architecture Pattern: Three-tier architecture
- Presentation Layer: React Native Frontend
- Application Layer: Node.js/Express Backend
- Data Layer: MongoDB Database

Key Components:
1. API Gateway: Express server with CORS
2. Authentication: JWT-based authentication
3. Authorization: Role-based access control
4. Validation: Input sanitization and validation
5. Error Handling: Centralized error handler
6. Logging: Audit logging for all operations

(Refer to 2_System_Architecture_Diagram.md for visual architecture)

================================================================================
10. SECURITY FEATURES
================================================================================

✓ Password Hashing: bcryptjs with salt rounds
✓ JWT Authentication: Token-based session management
✓ CORS Protection: Controlled origin access
✓ Helmet.js: Security headers
✓ Rate Limiting: API endpoint throttling
✓ Input Sanitization: MongoDB injection prevention
✓ XSS Protection: Cross-site scripting defense
✓ HTTPS: SSL/TLS in production
✓ Audit Logging: Track all user actions
✓ Role-Based Access: Function-level authorization

================================================================================
11. FEATURES BY MODULE
================================================================================

Authentication Module:
- User registration (multi-role support)
- Secure login with JWT
- Profile management
- Farmer approval workflow
- Password reset capability

Stock Management Module:
- Add/Edit/Delete stock items
- Category-based organization
- Quality grading (A/B/C)
- Shelf-life tracking
- Harvest date recording
- Stock status management
- Expiry alerts

Order Management Module:
- Multi-item orders
- Step-by-step order workflow
- Farmer confirmation system
- Stock deduction tracking
- Order history and tracking

Delivery Module:
- Automatic agent assignment
- Location-based matching
- Capacity optimization
- Real-time tracking
- Route optimization

Payment Module:
- Multiple payment methods
- Transaction verification
- Payment status tracking
- Refund capability
- Payment reconciliation

Review & Rating Module:
- Product reviews
- Farmer ratings
- Delivery service ratings
- Review verification
- Helpful voting system

Admin Module:
- User management
- Farmer approval
- Dispute resolution
- Report generation
- Audit logging
- Dashboard analytics

================================================================================
12. SETUP AND INSTALLATION
================================================================================

Backend Setup:
1. Navigate to backend directory: cd backend
2. Install dependencies: npm install
3. Create .env file with required variables
4. Seed database: npm run seed
5. Start server: npm run dev

Frontend Setup:
1. Navigate to frontend directory: cd frontend
2. Install dependencies: npm install
3. Configure API base URL in config.js
4. Start development: expo start
5. Scan QR code with Expo app

================================================================================
13. IMPORTANT NOTES
================================================================================

- All timestamps are in UTC
- Prices are stored in base currency (INR by default)
- Stock quantities can be fractional (for items sold by weight)
- Order workflow is sequential and must follow defined status flow
- Delivery agents require approval before activation
- Audit logs capture all administrative actions
- System sends notifications for order status changes

================================================================================
14. SUPPORT & DOCUMENTATION
================================================================================

For detailed information, refer to:
1. Problem_Statement.md       - Project problem definition
2. System_Architecture_Diagram.md - Architecture overview
3. Database_Schema_Diagram.md  - Database structure
4. API_Endpoint_Table.md      - Complete API reference

================================================================================
15. SUBMISSION CHECKLIST
================================================================================

□ GitHub repository link added
□ Team member details completed
□ Deployment URLs configured
□ All documentation files included
□ Backend deployment verified
□ Frontend deployment verified
□ Database configured and tested
□ Sample data seeded
□ API endpoints tested
□ Admin user created
□ Authentication flow verified
□ At least one complete user workflow tested

================================================================================

Last Updated: May 2026
Project Version: 1.0.0
Status: Ready for Deployment

================================================================================
