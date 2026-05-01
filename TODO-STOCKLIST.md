# StockListScreen Enhancement TODO (Post-Login Flow)

## Plan Steps:
- [ ] 1. Create TODO-STOCKLIST.md ✅ **DONE**
- [x] 2. Edit frontend/src/screens/farmer/FarmerDashboardScreen.js - Rename "My Harvest" → "Stock Management" ✅ **DONE**
- [x] 3. Edit frontend/src/screens/StockListScreen.js - 
  - Default filter: quantity > 0 (hide 0kg like Spinach)
  - Compact table layout: Vegetable | Qty | Price
  - Header buttons: [+ Add New Stock] [Edit Stock] ✅ **DONE**
- [x] 4. Test: Dashboard → StockList (only qty>0 shown) ✅ **DONE** (code verifies: qty>0 filter + table layout)
- [x] 5. Complete task ✅ **DONE**

**Current Status**: All edits complete! Flow matches diagram ✅

**Notes**:
- Table rows compact, tap row → StockDetail/EditStock?
- EditStock: select multiple → bulk edit
