# Farmers Market Hub - Validations & Endpoints Documentation

---

## 📋 TABLE OF CONTENTS
1. [Frontend Validations (Farmer Side)](#frontend-validations-farmer-side)
2. [Backend Validations (Stock Validation)](#backend-validations-stock-validation)
3. [Authentication Validations](#authentication-validations)
4. [Order & Payment Validations](#order--payment-validations)
5. [Review Validations](#review-validations)
6. [Farmer API Endpoints](#farmer-api-endpoints)
7. [Stock API Endpoints](#stock-api-endpoints)
8. [Auth API Endpoints](#auth-api-endpoints)

---

## 🎯 FRONTEND VALIDATIONS (FARMER SIDE)

### 1. **Registration Form Validations** (`RegisterScreen.js`)

```javascript
const validateForm = () => {
  setLocalError('');
  
  // Required Fields
  if (!name.trim() || !email.trim() || !password) {
    setLocalError('❌ Please fill in all required fields (*).');
    return false;
  }

  // Full Name Validation
  if (!/^[a-zA-Z\s]{3,50}$/.test(name.trim())) {
    setLocalError('❌ Full Name must be 3-50 characters with no special symbols.');
    return false;
  }

  // Email Validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    setLocalError('❌ Please enter a valid email address.');
    return false;
  }

  // Password Validation (8+ chars, uppercase, number, special symbol)
  const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(password)) {
    setLocalError('❌ Password must contain 8+ chars, uppercase, number & symbol.');
    return false;
  }

  // Password Confirmation
  if (password !== confirmPassword) {
    setLocalError('❌ Passwords do not match.');
    return false;
  }

  // FARMER-SPECIFIC VALIDATIONS
  if (role === 'Farmer') {
    // Business Name (Farm Name)
    if (!businessName.trim() || businessName.length > 100) {
      setLocalError('❌ Farm Name is required and must be under 100 characters.');
      return false;
    }

    // Phone Number (Required for Farmers)
    if (!phone.trim() || !/^\d{10,15}$/.test(phone.trim())) {
      setLocalError('❌ Enter a valid 10-digit mobile number.');
      return false;
    }

    // District (Optional but if provided, must be valid)
    const formattedDistrict = district?.trim() 
      ? district.trim().charAt(0).toUpperCase() + district.trim().slice(1).toLowerCase() 
      : '';
    if (formattedDistrict && !['North', 'South', 'East', 'West', 'Central'].includes(formattedDistrict)) {
      setLocalError('❌ District must be North, South, East, West, or Central.');
      return false;
    }
  }

  // CUSTOMER-SPECIFIC VALIDATIONS
  if (role === 'Customer') {
    if (address.trim() && address.length > 200) {
      setLocalError('❌ Address must be under 200 characters.');
      return false;
    }
  }

  return true;
};
```

**Farmer Registration Requirements:**
- ✅ Full Name: 3-50 chars, letters only
- ✅ Email: Valid email format
- ✅ Password: 8+ chars, uppercase, digit, special symbol
- ✅ Farm Name: 1-100 chars (REQUIRED for farmers)
- ✅ Phone: 10-15 digits (REQUIRED for farmers)
- ✅ District: North, South, East, West, or Central
- ✅ Address: Max 200 chars

---

### 2. **Add Stock Form Validations** (`AddStockScreen.js`)

```javascript
const MIN_QTY_KG = 0.001;
const MAX_QTY_KG = 100000;
const MIN_PRICE_LKR = 0.01;
const PRICE_DECIMALS = 2;
const QTY_DECIMALS = 3;

const validateForm = () => {
  const nextErrors = {};
  const quantity = Number(form.quantity);
  const price = Number(form.pricePerKg);
  const harvest = parseFormDate(form.harvestDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Vegetable Name Validation
  if (!form.vegetableName.trim()) {
    nextErrors.vegetableName = 'Vegetable name is required.';
  } else if (!/^[a-zA-Z\s-]{2,60}$/.test(form.vegetableName.trim())) {
    nextErrors.vegetableName = 'Use 2-60 letters, spaces, or hyphens.';
  }

  // Category Validation
  if (!form.categoryId) {
    nextErrors.categoryId = 'Please choose a category from the list.';
  }

  // Quantity Validation
  const qtyStr = String(form.quantity || '').trim();
  if (!qtyStr) {
    nextErrors.quantity = 'Quantity is required.';
  } else if (!Number.isFinite(quantity)) {
    nextErrors.quantity = 'Enter a valid number (e.g. 12 or 12.5).';
  } else if (quantity < MIN_QTY_KG) {
    nextErrors.quantity = `Quantity must be at least ${MIN_QTY_KG} kg.`;
  } else if (quantity > MAX_QTY_KG) {
    nextErrors.quantity = `Quantity cannot exceed ${MAX_QTY_KG.toLocaleString()} kg.`;
  }

  // Price Validation
  const priceStr = String(form.pricePerKg || '').trim();
  if (!priceStr) {
    nextErrors.pricePerKg = 'Price per kg is required.';
  } else if (!Number.isFinite(price)) {
    nextErrors.pricePerKg = 'Enter a valid price (e.g. 120 or 120.50).';
  } else if (price < MIN_PRICE_LKR) {
    nextErrors.pricePerKg = `Minimum price is LKR ${MIN_PRICE_LKR}.`;
  } else if (selectedCategory && (price < selectedCategory.minPrice || price > selectedCategory.maxPrice)) {
    nextErrors.pricePerKg = `For this category, price must be LKR ${selectedCategory.minPrice} – ${selectedCategory.maxPrice} per kg.`;
  }

  // Harvest Date Validation
  if (!harvest) {
    nextErrors.harvestDate = 'Please choose a harvest date using the calendar.';
  } else if (harvest > today) {
    nextErrors.harvestDate = 'Harvest date cannot be in the future.';
  }

  // Status Validation
  if (!['Available', 'Out of Stock'].includes(form.status)) {
    nextErrors.status = 'Select an availability status.';
  }

  // Image Validation
  if (!image) {
    nextErrors.image = 'Stock image is required.';
  } else if (image.fileSize && image.fileSize > 2 * 1024 * 1024) {
    nextErrors.image = 'Image must be 2 MB or less.';
  }

  setErrors(nextErrors);
  return Object.keys(nextErrors).length === 0;
};
```

**Stock Form Requirements:**
- ✅ Vegetable Name: 2-60 chars, letters/spaces/hyphens only
- ✅ Category: Must select from dropdown
- ✅ Quantity: 0.001 - 100,000 kg (up to 3 decimals)
- ✅ Price: Min LKR 0.01, must be within category range
- ✅ Harvest Date: Cannot be in future, max 2 decimal places
- ✅ Status: "Available" or "Out of Stock"
- ✅ Image: Required, max 2MB

---

### 3. **Quantity & Price Input Sanitization** (`AddStockScreen.js`)

```javascript
// Sanitize quantity: positive decimal, max 3 fractional digits
const sanitizeQuantityInput = (raw) => {
  let t = String(raw || '').replace(/[^0-9.]/g, '');
  const parts = t.split('.');
  if (parts.length > 2) {
    t = parts[0] + '.' + parts.slice(1).join('');
  }
  const [intRaw, fracRaw = ''] = t.split('.');
  const frac = fracRaw.slice(0, QTY_DECIMALS);
  if (t.includes('.')) {
    return `${intRaw}.${frac}`;
  }
  return intRaw;
};

// Sanitize price: max 2 decimal places (LKR)
const sanitizePriceInput = (raw) => {
  let t = String(raw || '').replace(/[^0-9.]/g, '');
  const firstDot = t.indexOf('.');
  if (firstDot !== -1) {
    const intPart = t.slice(0, firstDot).replace(/\./g, '');
    const frac = t.slice(firstDot + 1).replace(/\./g, '');
    t = intPart + '.' + frac.slice(0, PRICE_DECIMALS);
  }
  return t;
};
```

---

## 🔐 BACKEND VALIDATIONS (STOCK VALIDATION)

### **Stock Validation Middleware** (`middleware/stockValidation.js`)

```javascript
const UNIT_ENUM = ['kg', 'g', 'pcs'];
const STATUS_ENUM = ['Available', 'Low Stock', 'Out of Stock', 'Expired', 'Frozen'];

const validateStockData = async (req, res, next) => {
  try {
    const isCreate = req.method === 'POST';

    // Auto-populate name and unit if missing
    if (isCreate) {
      if (!req.body.name && req.body.vegetableName) {
        req.body.name = String(req.body.vegetableName).trim();
      }
      if (!req.body.unit) {
        req.body.unit = 'kg';
      }
    }

    // ==================== CATEGORY VALIDATION ====================
    if (req.body.categoryId) {
      const categoryDoc = await Category.findById(req.body.categoryId);
      if (!categoryDoc) {
        return res.status(400).json({ message: 'Please select a valid category.' });
      }
      req.stockLimits = {
        minPriceLimit: categoryDoc.minPrice,
        maxPriceLimit: categoryDoc.maxPrice
      };
      if (isCreate && !req.body.category) {
        const fromSlug = categoryDoc.slug && isValidCategorySlug(categoryDoc.slug) ? categoryDoc.slug : null;
        req.body.category = fromSlug || inferCategorySlugFromLabel(categoryDoc.name);
      }
    }

    // ==================== REQUIRED FIELDS ====================
    if (isCreate && (!name || !category || !quantity || !pricePerKg || !harvestDate || !unit || !status)) {
      return res.status(400).json({
        message: 'Name, category, unit, quantity, price, harvest date, and status are required.'
      });
    }

    // ==================== IMAGE VALIDATION ====================
    if (isCreate && !req.file) {
      return res.status(400).json({ message: 'Stock image is required.' });
    }

    // ==================== NAME VALIDATION ====================
    if (name !== undefined) {
      const cleanName = String(name).trim();
      if (cleanName.length < 2 || cleanName.length > 60) {
        return res.status(400).json({ message: 'Name must be between 2 and 60 characters.' });
      }
      if (!/^[a-zA-Z\s-]+$/.test(cleanName)) {
        return res.status(400).json({ message: 'Name can only contain letters, spaces, and hyphens.' });
      }
      validatedData.name = cleanName;
    }

    // ==================== CATEGORY VALIDATION ====================
    if (category !== undefined) {
      const cleanCategory = String(category).toLowerCase().trim();
      if (!CATEGORY_ENUM.includes(cleanCategory)) {
        return res.status(400).json({
          message: `Category must be one of: ${CATEGORY_ENUM.join(', ')}`
        });
      }
      validatedData.category = cleanCategory;
    }

    // ==================== UNIT VALIDATION ====================
    if (unit !== undefined) {
      const cleanUnit = String(unit).toLowerCase().trim();
      if (!UNIT_ENUM.includes(cleanUnit)) {
        return res.status(400).json({
          message: `Unit must be one of: ${UNIT_ENUM.join(', ')}`
        });
      }
      validatedData.unit = cleanUnit;
    }

    // ==================== QUANTITY VALIDATION ====================
    if (quantity !== undefined) {
      const qty = Number(quantity);
      if (!Number.isFinite(qty) || qty < 0 || qty > 100000) {
        return res.status(400).json({ message: 'Quantity must be 0 or a positive number up to 100000.' });
      }
      validatedData.quantity = qty;
    }

    // ==================== PRICE VALIDATION ====================
    if (pricePerKg !== undefined) {
      const price = Number(pricePerKg);
      if (!Number.isFinite(price) || price < 0.01) {
        return res.status(400).json({ message: 'Price must be at least 0.01.' });
      }
      if (req.stockLimits) {
        const min = Number(req.stockLimits.minPriceLimit ?? 1);
        const maxRaw = req.stockLimits.maxPriceLimit;
        if (Number.isFinite(maxRaw)) {
          if (price < min || price > maxRaw) {
            return res.status(400).json({
              message: `Price must be between LKR ${min} and LKR ${maxRaw} per kg for the selected category.`
            });
          }
        } else if (price < min) {
          return res.status(400).json({
            message: `Price must be at least LKR ${min} per kg for the selected category.`
          });
        }
      }
      validatedData.pricePerKg = price;
    }

    // ==================== HARVEST DATE VALIDATION ====================
    if (harvestDate !== undefined) {
      const parsedHarvestDate = new Date(harvestDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (!isValidDate(parsedHarvestDate)) {
        return res.status(400).json({ message: 'Please enter a valid harvest date.' });
      }
      if (parsedHarvestDate > today) {
        return res.status(400).json({ message: 'Harvest date cannot be in the future.' });
      }
      validatedData.harvestDate = parsedHarvestDate;
    }

    // ==================== EXPIRY DATE VALIDATION ====================
    if (expiryDate !== undefined) {
      const parsedExpiryDate = new Date(expiryDate);
      const parsedHarvestDate = validatedData.harvestDate || (harvestDate ? new Date(harvestDate) : null);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (!isValidDate(parsedExpiryDate)) {
        return res.status(400).json({ message: 'Please enter a valid expiry date.' });
      }
      if (parsedExpiryDate <= today) {
        return res.status(400).json({ message: 'Expiry date must be after today.' });
      }
      if (parsedHarvestDate && isValidDate(parsedHarvestDate) && parsedExpiryDate <= parsedHarvestDate) {
        return res.status(400).json({ message: 'Expiry date must be after harvest date.' });
      }
      validatedData.expiryDate = parsedExpiryDate;
    }

    // ==================== QUALITY GRADE VALIDATION ====================
    if (qualityGrade !== undefined && !['A', 'B', 'C'].includes(qualityGrade)) {
      return res.status(400).json({ message: 'Quality grade must be A, B, or C.' });
    }

    // ==================== STATUS VALIDATION ====================
    if (status !== undefined && !STATUS_ENUM.includes(status)) {
      return res.status(400).json({
        message: `Status must be one of: ${STATUS_ENUM.join(', ')}`
      });
    }

    // ==================== DESCRIPTION VALIDATION ====================
    if (description !== undefined) {
      const cleanDesc = String(description).trim();
      if (cleanDesc.length > 500) {
        return res.status(400).json({ message: 'Description cannot exceed 500 characters.' });
      }
      validatedData.description = cleanDesc;
    }

    req.validatedData = validatedData;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Validation error', error: error.message });
  }
};
```

---

## 🔑 AUTHENTICATION VALIDATIONS

### **Registration Validation** (`authController.js`)

```javascript
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, role, profileDetails } = req.body;

    // ==================== REQUIRED FIELDS ====================
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: '❌ Please fill in all required fields (*).' });
    }

    // ==================== ROLE VALIDATION ====================
    if (role !== 'Farmer' && role !== 'Customer') {
      return res.status(400).json({ message: '❌ Role must be either Farmer or Customer.' });
    }

    // ==================== NAME VALIDATION ====================
    if (!/^[a-zA-Z\s]{3,50}$/.test(name)) {
      return res.status(400).json({ message: '❌ Full Name must be 3-50 characters with no special symbols.' });
    }

    // ==================== EMAIL VALIDATION ====================
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ message: '❌ Please enter a valid email address.' });
    }

    // ==================== PASSWORD VALIDATION ====================
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ message: '❌ Password must contain 8+ chars, uppercase, number & symbol.' });
    }

    // ==================== PHONE VALIDATION ====================
    const phone = normalizedProfileDetails.phone;
    if (role === 'Farmer') {
      if (!phone || !/^\d{10,15}$/.test(phone)) {
        return res.status(400).json({ message: '❌ Enter a valid 10-digit mobile number.' });
      }
    } else if (phone && !/^\d{10,15}$/.test(phone)) {
      return res.status(400).json({ message: '❌ Enter a valid 10-digit mobile number.' });
    }

    // ==================== FARM NAME VALIDATION (Farmers Only) ====================
    if (role === 'Farmer') {
      const businessName = normalizedProfileDetails.businessName;
      if (!businessName || businessName.length > 100) {
        return res.status(400).json({ message: '❌ Farm Name is required and must be under 100 characters.' });
      }
    }

    // ==================== ADDRESS VALIDATION (Customers) ====================
    if (role === 'Customer') {
      const address = normalizedProfileDetails.address;
      if (address && address.length > 200) {
        return res.status(400).json({ message: '❌ Address must be under 200 characters.' });
      }
    }

    // ==================== DUPLICATE CHECK ====================
    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return res.status(400).json({ message: '❌ A user with this email already exists.' });
    }

    if (phone) {
      const phoneExists = await User.findOne({ 'profileDetails.phone': phone });
      if (phoneExists) {
        return res.status(400).json({ message: 'A user with this phone number already exists.' });
      }
    }

    // Password hashing...
    // User creation...
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
```

---

## 🛒 ORDER & PAYMENT VALIDATIONS

### **Order Item Validation** (`models/Order.js`)

```javascript
const orderItemSchema = new mongoose.Schema({
  stockId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Stock',
    required: true
  },
  product: {
    type: String,
    required: [true, 'Please provide a product name']
  },
  quantity: {
    type: Number,
    required: [true, 'Please provide quantity'],
    min: 0.1  // ← Minimum 0.1 kg per item
  },
  price: {
    type: Number,
    required: [true, 'Please provide price per unit']
  },
  farmerId: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  farmerConfirmed: { type: Boolean, default: false },
  farmerConfirmedAt: { type: Date, default: null },
  stockDeducted: { type: Boolean, default: false }
});

const orderSchema = new mongoose.Schema({
  customerName: {
    type: String,
    required: [true, 'Please provide a customer name'],
    trim: true,
    minlength: 2
  },
  totalAmount: {
    type: Number,
    required: [true, 'Please provide total amount']
  },
  status: {
    type: String,
    enum: [
      'PENDING',           // Step 1: Order created by customer
      'CONFIRMED',         // Step 2: Stock checked and confirmed
      'CANCELLED',        // Step 2: Stock not available
      'READY_FOR_DELIVERY', // Step 3: Ready for delivery
      'ASSIGNED',         // Step 4: Delivery agent assigned
      'IN_TRANSIT',       // Step 5: Agent started delivery
      'DELIVERED',        // Step 6: Delivery completed
      'FAILED_DELIVERY'    // Delivery failed
    ],
    default: 'PENDING'
  },
  items: {
    type: [orderItemSchema],
    validate: [(v) => Array.isArray(v) && v.length > 0, 'Order must have at least one item']
  }
});
```

**Order Status Flow:**
- ✅ PENDING → CONFIRMED → READY_FOR_DELIVERY → ASSIGNED → IN_TRANSIT → DELIVERED
- ✅ Can be CANCELLED or FAILED_DELIVERY at any step

---

## ⭐ REVIEW VALIDATIONS

### **Review Validation** (`reviewController.js`)

```javascript
const COMMENT_MIN_LENGTH = 3;
const COMMENT_MAX_LENGTH = 600;
const PROFANITY_PATTERNS = [
  /bad|terrible|awful/i  // Example patterns
];

function validateComment(comment) {
  if (comment.length < COMMENT_MIN_LENGTH) {
    return `Review text must be at least ${COMMENT_MIN_LENGTH} characters.`;
  }
  if (comment.length > COMMENT_MAX_LENGTH) {
    return `Review text cannot exceed ${COMMENT_MAX_LENGTH} characters.`;
  }
  // Check for profanity
  if (PROFANITY_PATTERNS.some((pattern) => pattern.test(comment))) {
    return 'Review contains inappropriate language.';
  }
  // Check for spam patterns (repeated characters)
  if (/(.)\1{7,}/i.test(comment)) {
    return 'Review looks like spam. Avoid repeated characters.';
  }
  // Check for repeated words
  const words = comment.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length >= 6) {
    const mostCommon = Math.max(...words.map((word) => words.filter((w) => w === word).length));
    if (mostCommon / words.length > 0.55) {
      return 'Review looks like spam. Avoid repeating the same words.';
    }
  }
  // Check for links/promotional content
  if (/(https?:\/\/|www\.|@\w+)/i.test(comment)) {
    return 'Review text cannot include links or promotional contact handles.';
  }
  return null;
}

function validateRating(value) {
  const numericRating = Number(value);
  if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
    return { error: 'Rating must be a whole number between 1 and 5.' };
  }
  return { rating: numericRating };
}
```

**Review Requirements:**
- ✅ Rating: 1-5 (integers only)
- ✅ Comment: 3-600 chars
- ✅ No profanity/spam/links
- ✅ No excessive character/word repetition

---

## 📡 FARMER API ENDPOINTS

### **Farmer Routes** (`routes/farmerRoutes.js`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/farmer/insights` | ✅ Farmer | Get dashboard insights |
| GET | `/api/farmer/stock-stats` | ✅ Farmer | Get stock statistics |
| GET | `/api/farmer/price-trends/:vegetableName` | ✅ Farmer | Get price trends for a vegetable |
| GET | `/api/farmer/orders` | ✅ Farmer | Get all farmer's orders |
| POST | `/api/farmer/orders/:id/confirm` | ✅ Farmer | Confirm order items |
| GET | `/api/farmer/orders/:id` | ✅ Farmer | Get specific order |
| GET | `/api/farmer/order/:id` | ✅ Farmer | Get order (any farmer on it) |
| GET | `/api/farmer/payments` | ✅ Farmer | Get payment history |

### **Dashboard Insights Endpoint** (`GET /api/farmer/insights`)

```javascript
// Response:
{
  "totalActiveStockValue": 50000,
  "mostProfitableVegetable": {
    "name": "Tomato",
    "profit": 15000
  },
  "lowStockAlerts": [
    {
      "_id": "stockId",
      "name": "Spinach",
      "quantity": 5
    }
  ],
  "expiryAlerts": [
    {
      "_id": "stockId",
      "name": "Lettuce",
      "expiryDate": "2024-05-10",
      "quantity": 20,
      "pricePerKg": 50
    }
  ],
  "priceOverview": [
    {
      "_id": "stockId",
      "name": "Tomato",
      "quantity": 100,
      "price": 45,
      "addedDate": "2024-05-01",
      "status": "Available"
    }
  ],
  "riskyItems": [
    {
      "_id": "stockId",
      "name": "Brinjal",
      "severity": "critical",
      "spoilageRiskLevel": "critical",
      "wastage": 50,
      "loss": 2500,
      "daysLeft": 2
    }
  ],
  "severityMix": {
    "critical": 2,
    "warning": 5,
    "none": 10
  },
  "spoilageSummary": {
    "low": 10,
    "medium": 5,
    "high": 4,
    "critical": 2
  },
  "stockStats": {
    "totalStocks": 21,
    "totalQuantity": 500,
    "availableItems": 15,
    "outOfStock": 3,
    "lowStockItems": 3,
    "criticalSpoilage": 6,
    "financialWastage": 12500
  }
}
```

### **Stock Stats Endpoint** (`GET /api/farmer/stock-stats`)

```javascript
// Response:
{
  "totalStocks": 21,
  "totalQuantity": 500.5,
  "availableItems": 15,
  "outOfStock": 3,
  "lowStockItems": 3,
  "criticalSpoilage": 6,
  "financialWastage": 12500.75
}
```

### **Price Trends Endpoint** (`GET /api/farmer/price-trends/:vegetableName`)

```javascript
// Response:
{
  "suggestedRange": {
    "min": 35,
    "max": 65,
    "average": 50
  },
  "last7DaysTrend": [
    {
      "price": 50,
      "date": "2024-05-01T10:30:00.000Z"
    },
    {
      "price": 48,
      "date": "2024-04-30T09:15:00.000Z"
    }
  ]
}
```

### **Get My Orders Endpoint** (`GET /api/farmer/orders`)

```javascript
// Response: Array of orders with items from this farmer
[
  {
    "_id": "orderId",
    "customerName": "John Doe",
    "totalAmount": 5000,
    "status": "PENDING",
    "items": [
      {
        "stockId": "stockId",
        "product": "Tomato",
        "quantity": 50,
        "price": 45,
        "farmerId": "farmerId",
        "farmerConfirmed": false,
        "stockDeducted": false
      }
    ],
    "createdAt": "2024-05-01T10:00:00.000Z"
  }
]
```

### **Confirm Order Items Endpoint** (`POST /api/farmer/orders/:id/confirm`)

```javascript
// Request Body: {}
// Response:
{
  "success": true,
  "message": "✅ Order confirmed. Stock deducted and notified.",
  "data": { /* full order object */ }
}
```

---

## 📦 STOCK API ENDPOINTS

### **Stock Routes** (`routes/stockRoutes.js`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/stocks` | ✅ Any | Get available stocks |
| POST | `/api/stocks` | ✅ Farmer | Create new stock |
| GET | `/api/stocks/my` | ✅ Farmer | Get farmer's stocks (with pagination) |
| GET | `/api/stocks/all` | ✅ Admin | Get all stocks (admin) |
| POST | `/api/stocks/bulk/add` | ✅ Farmer | Bulk add stocks |
| PUT | `/api/stocks/bulk/update` | ✅ Farmer | Bulk update stocks |
| DELETE | `/api/stocks/expired/all` | ✅ Farmer | Delete expired stocks |
| GET | `/api/stocks/:id` | ✅ Any | Get specific stock |
| PUT | `/api/stocks/:id` | ✅ Farmer | Update stock |
| DELETE | `/api/stocks/:id` | ✅ Farmer | Delete stock |
| PATCH | `/api/stocks/:id/visibility` | ✅ Farmer | Toggle visibility |
| PATCH | `/api/stocks/:id/status` | ✅ Farmer | Update status |
| PATCH | `/api/stocks/:id/deactivate` | ✅ Admin | Deactivate stock (admin) |
| PATCH | `/api/stocks/:id/quantity` | ✅ Farmer | Update quantity |
| PATCH | `/api/stocks/:id/price` | ✅ Farmer | Update price |
| PATCH | `/api/stocks/:id/availability` | ✅ Farmer | Update availability |

### **Create Stock Endpoint** (`POST /api/stocks`)

**Request:**
```javascript
{
  "name": "Tomato",
  "categoryId": "categoryId",
  "quantity": 100,
  "pricePerKg": 45.50,
  "harvestDate": "2024-04-30",
  "status": "Available",
  "qualityGrade": "A",
  "description": "Fresh organic tomatoes"
  // File: image (multipart/form-data)
}
```

**Response (201):**
```javascript
{
  "message": "✅ Stock for Tomato created successfully. It is listed on the marketplace for customers.",
  "stock": {
    "_id": "stockId",
    "farmerId": "farmerId",
    "name": "Tomato",
    "category": "fruiting",
    "quantity": 100,
    "pricePerKg": 45.50,
    "harvestDate": "2024-04-30",
    "expiryDate": "2024-05-15",
    "imageUrl": "/uploads/stock-image.jpg",
    "status": "Available",
    "qualityGrade": "A",
    "visibility": true,
    "availabilityStatus": true,
    "createdAt": "2024-05-01T10:00:00.000Z"
  }
}
```

### **Get My Stocks Endpoint** (`GET /api/stocks/my?page=1&limit=20`)

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `status`: Filter by status (Available, Low Stock, etc.)
- `lowStock`: Filter low stock items (true/false)
- `sort`: Sort by (newest, name, priceAsc, priceDesc, qtyDesc)

**Response:**
```javascript
{
  "stocks": [
    {
      "_id": "stockId",
      "name": "Tomato",
      "quantity": 100,
      "pricePerKg": 45.50,
      "status": "Available",
      "spoilageRiskLevel": "low",
      "daysLeft": 14,
      "atRiskValue": 0
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

### **Update Stock Endpoint** (`PUT /api/stocks/:id`)

**Request:**
```javascript
{
  "quantity": 85,
  "pricePerKg": 48.00,
  "status": "Low Stock",
  "description": "Updated description"
  // Optional: image file
}
```

**Response:**
```javascript
{
  "message": "✅ Stock updated successfully.",
  "changedFields": {
    "oldQuantity": 100,
    "newQuantity": 85,
    "oldPrice": 45.50,
    "newPrice": 48.00
  },
  "stock": { /* full stock object */ }
}
```

---

## 🔐 AUTH API ENDPOINTS

### **Auth Routes** (`routes/authRoutes.js`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | ❌ Public | Register new user |
| POST | `/api/auth/login` | ❌ Public | Login user |
| POST | `/api/auth/refresh` | ❌ Public | Refresh JWT token |
| GET | `/api/auth/me` | ✅ Any | Get current user profile |
| PUT | `/api/auth/profile` | ✅ Any | Update user profile |
| GET | `/api/auth/admin/pending-farmers` | ✅ Admin | Get pending farmers |
| POST | `/api/auth/admin/approve-farmer/:farmerId` | ✅ Admin | Approve farmer |
| POST | `/api/auth/admin/reject-farmer/:farmerId` | ✅ Admin | Reject farmer |

### **Register Endpoint** (`POST /api/auth/register`)

**Request:**
```javascript
{
  "name": "John Farmer",
  "email": "john@farm.com",
  "password": "SecurePass123!",
  "role": "Farmer",
  "profileDetails": {
    "businessName": "John's Farm",
    "phone": "9876543210",
    "region": "North",
    "address": "123 Farm Lane"
  }
}
```

**Response (201 - Farmer awaiting approval):**
```javascript
{
  "message": "✅ Registration Successful! Your account awaits admin approval.",
  "user": {
    "_id": "userId",
    "name": "John Farmer",
    "email": "john@farm.com",
    "role": "Farmer",
    "isApproved": false,
    "status": "Active"
  }
}
```

### **Login Endpoint** (`POST /api/auth/login`)

**Request:**
```javascript
{
  "email": "john@farm.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```javascript
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "_id": "userId",
    "name": "John Farmer",
    "email": "john@farm.com",
    "role": "Farmer",
    "isApproved": true,
    "status": "Active",
    "farmerId": "F0001"
  }
}
```

---

## 📋 SUMMARY TABLE

### **All Validations Overview**

| Category | Validation | Frontend | Backend | 
|----------|-----------|----------|---------|
| **User Registration** | Name (3-50, letters only) | ✅ | ✅ |
| | Email format | ✅ | ✅ |
| | Password (8+, uppercase, digit, symbol) | ✅ | ✅ |
| | Duplicate email/phone | ❌ | ✅ |
| | Farmer business name | ✅ | ✅ |
| | Phone (10-15 digits) | ✅ | ✅ |
| **Stock Creation** | Name (2-60, letters/spaces/hyphens) | ✅ | ✅ |
| | Category selection | ✅ | ✅ |
| | Quantity (0.001-100000) | ✅ | ✅ |
| | Price (within category range) | ✅ | ✅ |
| | Harvest date (not future) | ✅ | ✅ |
| | Expiry date (after harvest) | ✅ | ✅ |
| | Image (required, max 2MB) | ✅ | ✅ |
| **Orders** | Item quantity (min 0.1) | ❌ | ✅ |
| | Order status flow | ❌ | ✅ |
| | Farmer confirmation | ❌ | ✅ |
| **Reviews** | Rating (1-5, integer) | ❌ | ✅ |
| | Comment (3-600 chars) | ❌ | ✅ |
| | No profanity/spam/links | ❌ | ✅ |

---

## 🔄 ERROR HANDLING

All endpoints return structured error responses:

```javascript
// 400 - Bad Request
{
  "statusCode": 400,
  "message": "Validation error message"
}

// 401 - Unauthorized
{
  "statusCode": 401,
  "message": "Not authorized, token failed"
}

// 403 - Forbidden
{
  "statusCode": 403,
  "message": "Access denied. Farmer role required."
}

// 404 - Not Found
{
  "statusCode": 404,
  "message": "Stock not found"
}

// 500 - Server Error
{
  "statusCode": 500,
  "message": "Internal Server Error",
  "error": "error details"
}
```

---

## 🎯 KEY POINTS

1. **Farmer Registration** requires: name, email, password, farm name, phone, district
2. **Stock Validation** is strict: category-based price limits, date constraints, file size limits
3. **Orders** follow a clear status flow: PENDING → CONFIRMED → READY_FOR_DELIVERY → ASSIGNED → IN_TRANSIT → DELIVERED
4. **Reviews** have spam detection for profanity, links, and excessive repetition
5. **All authenticated endpoints** require JWT token in `Authorization: Bearer <token>` header
6. **Farmers must be approved by admin** before they can fully access the platform

