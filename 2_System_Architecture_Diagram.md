# System Architecture Diagram: Farmers Market Hub

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          FARMERS MARKET HUB SYSTEM ARCHITECTURE         │
└─────────────────────────────────────────────────────────────────────────┘

                              CLIENT LAYER
                    ┌────────────────────────────┐
                    │   React Native Frontend    │
                    │   (Expo-based Mobile App)  │
                    └────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
            ┌───────▼────────┐  ┌───────▼────────┐
            │   User Roles   │  │   Auth Context │
            ├────────────────┤  ├────────────────┤
            │ • Admin        │  │ • JWT Tokens   │
            │ • Farmer       │  │ • Permissions  │
            │ • Customer     │  │ • Session Mgmt │
            │ • DeliveryAgent│  └────────────────┘
            └────────────────┘

                         NETWORK LAYER (CORS)
                    ┌────────────────────────────┐
                    │   API Gateway with CORS    │
                    │   Base URL: /api/*         │
                    └────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        │              BACKEND LAYER (Node.js/Express)
        │              ┌──────────────────────────┐
        │              │   Express Server         │
        │              │   Port: 3000/5000        │
        │              ├──────────────────────────┤
        │              │ Middleware:              │
        │              │ • Helmet (Security)      │
        │              │ • Sanitization           │
        │              │ • Rate Limiting          │
        │              │ • Auth Verification      │
        │              └──────────────────────────┘
        │                      │
        │      ┌───────────────┼───────────────┐
        │      │               │               │
    ┌───▼──────▼─┐  ┌──────────▼──────┐  ┌────▼──────────┐
    │   Routes   │  │  Controllers    │  │  Middleware   │
    ├────────────┤  ├─────────────────┤  ├───────────────┤
    │ /auth      │  │ • authController│  │ • authMiddle  │
    │ /stock     │  │ • stockControll │  │ • errorHandler│
    │ /order     │  │ • orderControll │  │ • validate    │
    │ /delivery  │  │ • deliveryContr │  │ • upload      │
    │ /payment   │  │ • reportControll│  └───────────────┘
    │ /review    │  │ • paymentContr  │
    │ /admin     │  │ • farmerControll│
    │ /farmer    │  │ • reviewControll│
    │ /market    │  │ • adminControll │
    │ /notif     │  │ • notifyControll│
    └────────────┘  └─────────────────┘

                         DATABASE LAYER
                    ┌────────────────────────────┐
                    │    MongoDB Database        │
                    │  (Mongoose ODM)            │
                    ├────────────────────────────┤
                    │  Collections:              │
                    │  • Users                   │
                    │  • Stock / StockHistory    │
                    │  • Orders                  │
                    │  • Payments                │
                    │  • Deliveries             │
                    │  • Reviews                │
                    │  • Categories             │
                    │  • Notifications          │
                    │  • AuditLogs              │
                    │  • Reports                │
                    └────────────────────────────┘

                      UTILITY & SERVICE LAYER
    ┌───────────────────┬──────────────────┬─────────────────┐
    │  Authentication   │  Cron Jobs       │  File Upload    │
    ├───────────────────┼──────────────────┼─────────────────┤
    │ • JWT Generation  │ • Sync Expired   │ • Multer        │
    │ • Password Hash   │   Listings       │ • Image Storage │
    │ • Token Verify    │ • Auto Cleanup   │ • Validation    │
    └───────────────────┴──────────────────┴─────────────────┘

                      EXTERNAL SERVICES
    ┌────────────────────────────────────────────────────┐
    │ • Payment Gateway Integration                      │
    │ • Email/SMS Notifications (Future)                 │
    │ • File Storage Service (Cloud/Local)               │
    │ • Analytics & Reporting                            │
    └────────────────────────────────────────────────────┘
```

## Component Interaction Flow

```
┌─────────────┐
│   Customer  │
└──────┬──────┘
       │ 1. Register/Login
       ▼
┌──────────────────┐      ┌─────────────────┐
│ Auth Controller  │────▶ │ User Model      │
├──────────────────┤      ├─────────────────┤
│ • Register       │      │ • Credentials   │
│ • Login          │      │ • Profile       │
│ • JWT Generate   │      │ • Roles         │
└──────────────────┘      └─────────────────┘
                                   │
       ┌─────────────────────────────┼─────────────────────────────┐
       │ 2. Browse Stock             │ 3. View Orders              │ 4. Manage Delivery
       ▼                             ▼                             ▼
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│ Stock Controller │      │ Order Controller │      │ Delivery Manager │
├──────────────────┤      ├──────────────────┤      ├──────────────────┤
│ • Browse/Search  │      │ • Create Order   │      │ • Assign Agent   │
│ • Filter         │      │ • Track Status   │      │ • Route Optimize │
│ • View Details   │      │ • Confirm Items  │      │ • Live Tracking  │
└──────────────────┘      └──────────────────┘      └──────────────────┘
       │                          │                        │
       ▼                          ▼                        ▼
┌─────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│ Stock Model     │      │ Order Model      │      │ Delivery Model   │
└─────────────────┘      └──────────────────┘      └──────────────────┘

                    5. Payment Processing
                           │
                           ▼
                  ┌──────────────────┐
                  │ Payment Gateway  │
                  │ (External)       │
                  └──────────────────┘
```

## Data Flow Architecture

```
USER REQUEST
    │
    ├─▶ CORS Validation ─▶ Route Matching
    │
    ├─▶ Authentication Middleware
    │   └─▶ JWT Verification ─▶ Role Checking
    │
    ├─▶ Business Logic (Controllers)
    │   └─▶ Data Validation
    │       └─▶ Database Operations (Mongoose)
    │           ├─▶ Read Operations (Query)
    │           ├─▶ Create Operations (Insert)
    │           ├─▶ Update Operations (Modify)
    │           └─▶ Delete Operations (Remove)
    │
    ├─▶ Response Formatting
    │   └─▶ Error Handling
    │
    └─▶ Send Response to Client
```

## Security Architecture

```
┌────────────────────────────────────────┐
│      SECURITY LAYERS                   │
├────────────────────────────────────────┤
│ 1. HTTPS/TLS (In Production)           │
│ 2. CORS Policy Enforcement             │
│ 3. Helmet.js Security Headers          │
│ 4. JWT Token Authentication            │
│ 5. Password Hashing (bcryptjs)         │
│ 6. Input Sanitization & Validation     │
│ 7. Rate Limiting (express-rate-limit)  │
│ 8. XSS Protection                      │
│ 9. Mongo Injection Prevention           │
│ 10. Role-Based Access Control (RBAC)   │
│ 11. Audit Logging for All Actions      │
└────────────────────────────────────────┘
```

## Deployment Architecture

```
┌─────────────────────────────────────────┐
│     Production Environment              │
├─────────────────────────────────────────┤
│ Cloud Platform (Render.yml)             │
│ ├─ Frontend: Expo/React Native          │
│ ├─ Backend: Node.js Server              │
│ └─ Database: MongoDB Atlas/Local        │
└─────────────────────────────────────────┘
```
