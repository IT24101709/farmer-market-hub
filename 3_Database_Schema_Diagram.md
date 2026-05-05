# Database Schema Diagram: Farmers Market Hub

## MongoDB Collections Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      FARMERS MARKET HUB DATABASE SCHEMA                 │
└─────────────────────────────────────────────────────────────────────────┘
```

## 1. USERS Collection

```
┌──────────────────────────────────┐
│         Users Collection         │
├──────────────────────────────────┤
│ _id: ObjectId (Primary Key)      │
│ name: String                     │
│ email: String (Unique)           │
│ password: String (Hashed)        │
│ role: Enum [Admin, Farmer,       │
│              Customer,           │
│              DeliveryAgent]      │
│ farmerId: String (Unique,Sparse) │
│ status: Enum [Active,            │
│              Suspended,          │
│              Blocked,            │
│              Pending Approval]   │
│ isApproved: Boolean              │
│ twoFactorEnabled: Boolean        │
│ suspendedUntil: Date             │
│ stockFrozenUntil: Date           │
├──────────────────────────────────┤
│ profileDetails: Object           │
│  ├─ contactPerson: String        │
│  ├─ region: Enum [North,South,   │
│  │             East,West,Central]│
│  ├─ maxStockLimit: Number        │
│  ├─ phone: String                │
│  ├─ address: String              │
│  ├─ businessName: String         │
│  ├─ maxCapacityKg: Number        │
│  ├─ vehicleType: Enum [bike,van, │
│  │               truck,tempo]    │
│  └─ serviceCities: [String]      │
│                                  │
│ createdAt: Date (Index)          │
│ updatedAt: Date (Index)          │
└──────────────────────────────────┘
   │
   ├─▶ References: Stock(farmerId)
   ├─▶ References: Order(customerId)
   ├─▶ References: Order(deliveryAgentId)
   ├─▶ References: Review(farmerId)
   ├─▶ References: Delivery(agentId)
   └─▶ References: AuditLog(userId)
```

## 2. STOCK Collection

```
┌──────────────────────────────────┐
│        Stock Collection          │
├──────────────────────────────────┤
│ _id: ObjectId (Primary Key)      │
│ farmerId: ObjectId (Ref: Users)  │
│ name: String (Product Name)      │
│ category: Enum [Fruits,          │
│           Vegetables, Grains,    │
│           Dairy, Herbs, Others]  │
│ categoryId: ObjectId             │
│ quantity: Number (Min: 0)        │
│ unit: Enum [kg, g, pcs]          │
│ pricePerKg: Number (Min: 0.01)   │
│ harvestDate: Date                │
│ description: String              │
│ imageUrl: String                 │
│ qualityGrade: Enum [A, B, C]     │
│                                  │
│ status: Enum [Available,         │
│              Low Stock,          │
│              Out of Stock,       │
│              Expired,            │
│              Frozen]             │
│                                  │
│ shelfLifeDays: Number            │
│ expiryDate: Date                 │
│ lastRestockDate: Date            │
│ lowStockThreshold: Number        │
│                                  │
│ isArchived: Boolean              │
│ archiveReason: String            │
│ archiveDate: Date                │
│                                  │
│ createdAt: Date (Index)          │
│ updatedAt: Date (Index)          │
└──────────────────────────────────┘
   │
   ├─▶ References: Users(farmerId)
   ├─▶ References: Category(categoryId)
   ├─▶ References: Order(items.stockId)
   └─▶ References: StockHistory(stockId)
```

## 3. STOCK_HISTORY Collection

```
┌──────────────────────────────────┐
│     StockHistory Collection      │
├──────────────────────────────────┤
│ _id: ObjectId (Primary Key)      │
│ stockId: ObjectId (Ref: Stock)   │
│ farmerId: ObjectId (Ref: Users)  │
│ actionType: Enum [ADD, UPDATE,   │
│             DEDUCT, FREEZE,      │
│             UNFREEZE, ARCHIVE]   │
│ quantityBefore: Number           │
│ quantityAfter: Number            │
│ changeAmount: Number             │
│ reason: String                   │
│ relatedOrderId: ObjectId         │
│ notes: String                    │
│ createdAt: Date (Index)          │
│ createdBy: ObjectId (Ref: Users) │
└──────────────────────────────────┘
   │
   ├─▶ References: Stock(stockId)
   └─▶ References: Users(createdBy)
```

## 4. ORDERS Collection

```
┌──────────────────────────────────┐
│       Orders Collection          │
├──────────────────────────────────┤
│ _id: ObjectId (Primary Key)      │
│ customerName: String             │
│ customerId: ObjectId (Ref:Users) │
│ totalAmount: Number              │
│                                  │
│ status: Enum [PENDING,           │
│       CONFIRMED, CANCELLED,      │
│       READY_FOR_DELIVERY,        │
│       ASSIGNED, IN_TRANSIT,      │
│       DELIVERED, FAILED_DELIVERY]│
│                                  │
│ items: [{                        │
│   stockId: ObjectId,             │
│   product: String,               │
│   quantity: Number,              │
│   price: Number,                 │
│   farmerId: ObjectId,            │
│   farmerConfirmed: Boolean,      │
│   farmerConfirmedAt: Date,       │
│   stockDeducted: Boolean         │
│ }]                               │
│                                  │
│ paymentId: ObjectId              │
│ paymentStatus: Enum [PENDING,    │
│        COMPLETED, FAILED]        │
│                                  │
│ deliveryAgentId: ObjectId        │
│ deliveryAssignedAt: Date         │
│ deliveredAt: Date                │
│ deliveryNotes: String            │
│                                  │
│ orderDate: Date (Index)          │
│ createdAt: Date (Index)          │
│ updatedAt: Date (Index)          │
└──────────────────────────────────┘
   │
   ├─▶ References: Users(customerId)
   ├─▶ References: Stock(items.stockId)
   ├─▶ References: Users(items.farmerId)
   ├─▶ References: Payment(paymentId)
   ├─▶ References: Users(deliveryAgentId)
   ├─▶ References: Delivery(relatedDeliveryId)
   └─▶ References: Notification(relatedOrderId)
```

## 5. PAYMENTS Collection

```
┌──────────────────────────────────┐
│      Payments Collection         │
├──────────────────────────────────┤
│ _id: ObjectId (Primary Key)      │
│ orderId: ObjectId (Ref: Orders)  │
│ customerId: ObjectId (Ref:Users) │
│ amount: Number                   │
│ currency: String (Default: INR)  │
│                                  │
│ paymentMethod: Enum [Credit,     │
│           Debit, UPI,            │
│           Wallet, COD]           │
│                                  │
│ status: Enum [PENDING,           │
│       COMPLETED, FAILED,         │
│       CANCELLED, REFUNDED]       │
│                                  │
│ transactionId: String (Unique)   │
│ gatewayResponse: Object          │
│ paymentGateway: String           │
│                                  │
│ paidAt: Date                     │
│ refundedAt: Date                 │
│ refundAmount: Number             │
│                                  │
│ createdAt: Date (Index)          │
│ updatedAt: Date (Index)          │
└──────────────────────────────────┘
   │
   ├─▶ References: Orders(orderId)
   └─▶ References: Users(customerId)
```

## 6. DELIVERIES Collection

```
┌──────────────────────────────────┐
│     Deliveries Collection        │
├──────────────────────────────────┤
│ _id: ObjectId (Primary Key)      │
│ orderId: ObjectId (Ref: Orders)  │
│ agentId: ObjectId (Ref: Users)   │
│                                  │
│ status: Enum [PENDING,           │
│       ASSIGNED, IN_TRANSIT,      │
│       DELIVERED, FAILED,         │
│       CANCELLED]                 │
│                                  │
│ pickupLocation: {                │
│   address: String,               │
│   coordinates: {lat, lng}        │
│ }                                │
│                                  │
│ deliveryLocation: {              │
│   address: String,               │
│   coordinates: {lat, lng}        │
│ }                                │
│                                  │
│ assignedAt: Date                 │
│ startedAt: Date                  │
│ completedAt: Date                │
│ estimatedDeliveryTime: Date      │
│ actualDeliveryTime: Date         │
│                                  │
│ distance: Number (in km)         │
│ deliveryNotes: String            │
│ failureReason: String            │
│                                  │
│ createdAt: Date (Index)          │
│ updatedAt: Date (Index)          │
└──────────────────────────────────┘
   │
   ├─▶ References: Orders(orderId)
   └─▶ References: Users(agentId)
```

## 7. REVIEWS Collection

```
┌──────────────────────────────────┐
│       Reviews Collection         │
├──────────────────────────────────┤
│ _id: ObjectId (Primary Key)      │
│ orderId: ObjectId (Ref: Orders)  │
│ customerId: ObjectId (Ref:Users) │
│ farmerId: ObjectId (Ref: Users)  │
│ agentId: ObjectId                │
│                                  │
│ rating: Number (1-5 stars)       │
│ comment: String (Max: 500 chars) │
│                                  │
│ reviewType: Enum [PRODUCT,       │
│           FARMER, DELIVERY,      │
│           OVERALL]               │
│                                  │
│ isVerifiedPurchase: Boolean      │
│ helpful: Number                  │
│                                  │
│ createdAt: Date (Index)          │
│ updatedAt: Date (Index)          │
└──────────────────────────────────┘
   │
   ├─▶ References: Orders(orderId)
   ├─▶ References: Users(customerId)
   ├─▶ References: Users(farmerId)
   └─▶ References: Users(agentId)
```

## 8. NOTIFICATIONS Collection

```
┌──────────────────────────────────┐
│     Notifications Collection     │
├──────────────────────────────────┤
│ _id: ObjectId (Primary Key)      │
│ userId: ObjectId (Ref: Users)    │
│ type: Enum [ORDER_STATUS,        │
│       STOCK_AVAILABLE, PAYMENT,  │
│       DELIVERY, REVIEW_REQUEST,  │
│       SYSTEM]                    │
│                                  │
│ title: String                    │
│ message: String                  │
│ relatedOrderId: ObjectId         │
│ relatedStockId: ObjectId         │
│                                  │
│ isRead: Boolean (Default: false) │
│ readAt: Date                     │
│                                  │
│ actionUrl: String                │
│ createdAt: Date (Index)          │
│ expiresAt: Date                  │
└──────────────────────────────────┘
   │
   └─▶ References: Users(userId)
```

## 9. CATEGORIES Collection

```
┌──────────────────────────────────┐
│     Categories Collection        │
├──────────────────────────────────┤
│ _id: ObjectId (Primary Key)      │
│ name: String (Unique)            │
│ description: String              │
│ imageUrl: String                 │
│                                  │
│ status: Enum [Active, Inactive]  │
│ displayOrder: Number             │
│                                  │
│ createdAt: Date (Index)          │
│ updatedAt: Date (Index)          │
└──────────────────────────────────┘
   │
   └─▶ References: Stock(categoryId)
```

## 10. AUDIT_LOGS Collection

```
┌──────────────────────────────────┐
│      AuditLogs Collection        │
├──────────────────────────────────┤
│ _id: ObjectId (Primary Key)      │
│ userId: ObjectId (Ref: Users)    │
│ action: String                   │
│ resourceType: String             │
│ resourceId: ObjectId             │
│                                  │
│ changes: {                       │
│   before: Object,                │
│   after: Object                  │
│ }                                │
│                                  │
│ ipAddress: String                │
│ userAgent: String                │
│ status: Enum [SUCCESS, FAILED]   │
│                                  │
│ timestamp: Date (Index)          │
│ createdAt: Date (Index)          │
└──────────────────────────────────┘
   │
   └─▶ References: Users(userId)
```

## 11. REPORTS Collection

```
┌──────────────────────────────────┐
│       Reports Collection         │
├──────────────────────────────────┤
│ _id: ObjectId (Primary Key)      │
│ reportType: Enum [SALES,         │
│       INVENTORY, DELIVERY,       │
│       DISPUTES, REVENUE]         │
│                                  │
│ generatedBy: ObjectId            │
│ generatedFor: ObjectId           │
│ dateFrom: Date                   │
│ dateTo: Date                     │
│                                  │
│ data: Object (Report specifics)  │
│ summary: String                  │
│ attachmentUrl: String            │
│                                  │
│ createdAt: Date (Index)          │
│ updatedAt: Date (Index)          │
└──────────────────────────────────┘
   │
   └─▶ References: Users(generatedBy)
```

## Relationships Diagram

```
                        ┌─────────────┐
                        │    Users    │
                        └──────┬──────┘
           ┌────────────────┬──┴──┬────────────────┐
           │                │     │                │
           ▼                ▼     ▼                ▼
        ┌──────┐       ┌────────┐  ┌─────────┐  ┌──────────┐
        │Stock │       │Orders  │  │Payments │  │Deliveries│
        └──┬───┘       └─────┬──┘  └────┬────┘  └────┬─────┘
           │                 │          │            │
           │                 ▼          ▼            ▼
           │            ┌──────────┐ ┌────────┐ ┌────────┐
           │            │Stock     │ │Payment │ │Reviews │
           │            │History   │ │        │ │(Agent) │
           │            └──────────┘ └────────┘ └────────┘
           │
           ▼
        ┌──────────┐    ┌────────────┐    ┌───────────┐
        │Reviews   │    │Notif       │    │AuditLogs  │
        │(Product) │    │ications    │    │           │
        └──────────┘    └────────────┘    └───────────┘

        ┌──────────┐    ┌────────────┐    ┌───────────┐
        │Categories│    │Reports     │    │Counters   │
        └──────────┘    └────────────┘    └───────────┘
```

## Key Indexes

```
Users:
  - email (Unique)
  - farmerId (Unique, Sparse)
  - createdAt (Ascending)
  - status (Regular)

Stock:
  - farmerId (Regular)
  - category (Regular)
  - status (Regular)
  - expiryDate (Regular)
  - createdAt (Descending)

Orders:
  - customerId (Regular)
  - status (Regular)
  - orderDate (Descending)
  - createdAt (Descending)

Payments:
  - orderId (Unique)
  - customerId (Regular)
  - status (Regular)
  - transactionId (Unique)

Deliveries:
  - orderId (Unique)
  - agentId (Regular)
  - status (Regular)

Reviews:
  - farmerId (Regular)
  - customerId (Regular)
  - orderId (Unique)

Notifications:
  - userId (Regular)
  - isRead (Regular)
  - createdAt (Descending)

AuditLogs:
  - userId (Regular)
  - timestamp (Descending)
  - resourceType (Regular)
```
