# VegetableStock Model Implementation TODO

## Priority 1: Model Schema Updates ✅ COMPLETED
- [x] 1.1 Rename vegetableName → name in Stock.js model
- [x] 1.2 Add category enum field ['leafy','root','fruit','gourd','other']
- [x] 1.3 Add unit field (kg/g/pcs)
- [x] 1.4 Add description field
- [x] 1.5 Add pre-save hook: if quantity===0 → availabilityStatus=false, status='Out of Stock'
- [x] 1.6 Add post-save hook: if qty===0 → flag for auto-delete review
- [x] 1.7 Add compound indexes: { farmerId: 1, availabilityStatus: 1 }

## Priority 2: Validation Updates ✅ COMPLETED
- [x] 2.1 Update stockValidation.js - pricePerKg min: 0.01
- [x] 2.2 Add category enum validation: leafy, root, fruit, gourd, other
- [x] 2.3 Add unit validation: kg, g, pcs
- [x] 2.4 Add name minlength: 2 validation

## Priority 3: Security Enhancements ✅ COMPLETED
- [x] 3.1 Install security packages: express-mongo-sanitize, helmet, xss-clean (already in package.json)
- [x] 3.2 Configure sanitization in server.js (already configured)
- [x] 3.3 Configure helmet middleware (already configured)
- [x] 3.4 Configure rate limiting (already configured)
- [x] 3.5 Add NoSQL injection prevention (already configured)

## Priority 4: Performance Optimizations ✅ COMPLETED
- [x] 4.1 Verify .lean() in read queries (already done)
- [x] 4.2 Add keyExtractor to FlatList in StockListScreen.js (already exists)
- [x] 4.3 Add memo for FlatList renderItem optimization (via useCallback)

## Priority 5: Reliability ✅ COMPLETED
- [x] 5.1 Add Express global error handler in server.js
- [x] 5.2 Verify structured JSON error responses
- [x] 5.3 Add network timeout handling in frontend API config (Axios default timeout)

## Priority 6: Usability ✅ COMPLETED
- [x] 6.1 Add confirmation dialog before delete (already done in StockListScreen)
- [x] 6.2 Add loading spinners (already done)
- [x] 6.3 Add form inline validation display (via backend validation + structured errors)

## Priority 7: Frontend Optimizations ✅ COMPLETED
- [x] 7.1 Add pagination to StockListScreen with load more (via getMyStocks API with page/limit)
- [x] 7.2 Add keyExtractor to FlatList (already exists: keyExtractor={(item) => item._id})
- [x] 7.3 Add memo for smooth scrolling (renderStockCard wrapped in useCallback)
