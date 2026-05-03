import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, AuthContext } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';
import { NotificationProvider } from '../context/NotificationContext';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AppFooter from '../components/AppFooter';
import theme from '../theme';

// Screens
import StockListScreen from '../screens/StockListScreen';
import AddStockScreen from '../screens/AddStockScreen';
import EditStockScreen from '../screens/EditStockScreen';
import StockDetailScreen from '../screens/StockDetailScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import FarmerApprovalScreen from '../screens/admin/FarmerApprovalScreen';
import ManageFarmersScreen from '../screens/admin/ManageFarmersScreen';
import ManageCategoriesScreen from '../screens/admin/ManageCategoriesScreen';
import FarmerDashboardScreen from '../screens/farmer/FarmerDashboardScreen';
import FarmerProfileScreen from '../screens/farmer/FarmerProfileScreen';
import MyOrdersScreen from '../screens/farmer/MyOrdersScreen';
import OrderDetailsScreen from '../screens/farmer/OrderDetailsScreen';
import PaymentHistoryScreen from '../screens/farmer/PaymentHistoryScreen';
import MarketplaceScreen from '../screens/customer/MarketplaceScreen';
import CartScreen from '../screens/customer/CartScreen';
import CustomerOrdersScreen from '../screens/customer/CustomerOrdersScreen';
import CustomerOrderDetailScreen from '../screens/customer/CustomerOrderDetailScreen';
import LandingScreen from '../screens/public/LandingScreen';
import AdminOrderDetailScreen from '../screens/admin/AdminOrderDetailScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';
import DeliveryDashboardScreen from '../screens/delivery/DeliveryDashboardScreen';
import DeliveryHistoryScreen from '../screens/delivery/DeliveryHistoryScreen';
// Orders module screens
import PlaceOrderScreen from '../screens/orders/PlaceOrderScreen';
import OrderDetailScreen from '../screens/orders/OrderDetailScreen';
import AdminOrdersScreenFixed from '../screens/orders/AdminOrdersScreen';
// Delivery module screens
import AdminDeliveriesScreen from '../screens/delivery/AdminDeliveriesScreen';
import DeliveryDetailScreen from '../screens/delivery/DeliveryDetailScreen';
import AgentDeliveriesScreen from '../screens/delivery/AgentDeliveriesScreen';
import AgentDeliveryDetailScreen from '../screens/delivery/AgentDeliveryDetailScreen';
// Payment module screens
import PaymentScreen from '../screens/customer/PaymentScreen';
import PaymentReceiptScreen from '../screens/customer/PaymentReceiptScreen';
import CustomerPaymentHistoryScreen from '../screens/customer/CustomerPaymentHistoryScreen';
import AdminPaymentScreen from '../screens/admin/AdminPaymentScreen';
import PaymentDetailScreen from '../screens/admin/PaymentDetailScreen';
import AdminReviewsScreen from '../screens/admin/AdminReviewsScreen';
import AdminReportsScreen from '../screens/admin/AdminReportsScreen';
import ReviewsScreen from '../screens/reviews/ReviewsScreen';

const Stack = createNativeStackNavigator();

/** Admin stack: jump back to dashboard from order flows */
const adminDashboardHeaderButton = (navigation) => (
  <TouchableOpacity
    onPress={() => navigation.navigate('AdminDashboard')}
    style={{ marginRight: 12, paddingVertical: 6, paddingHorizontal: 4 }}
    accessibilityRole="button"
    accessibilityLabel="Open admin dashboard"
  >
    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Dashboard</Text>
  </TouchableOpacity>
);

const FarmerStack = () => (
  <Stack.Navigator 
    initialRouteName="FarmerDashboard"
    screenOptions={{
      headerStyle: { backgroundColor: theme.header },
      headerTintColor: '#fff',
      headerTitleStyle: { fontWeight: 'bold' }
    }}
  >
    <Stack.Screen name="FarmerDashboard" component={FarmerDashboardScreen} options={{ headerShown: false }} />
    <Stack.Screen name="StockList" component={StockListScreen} options={{ title: 'My Harvest' }} />
    <Stack.Screen name="AddStock" component={AddStockScreen} options={{ title: 'Add New Vegetable' }} />
    <Stack.Screen name="StockDetail" component={StockDetailScreen} options={{ title: 'Stock Details' }} />
    <Stack.Screen name="EditStock" component={EditStockScreen} options={{ title: 'Edit Stock' }} />
    <Stack.Screen name="FarmerProfile" component={FarmerProfileScreen} options={{ title: 'My Profile' }} />
    <Stack.Screen name="MyOrders" component={MyOrdersScreen} options={{ title: 'My Orders' }} />
    <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} options={{ title: 'Order Details' }} />
    <Stack.Screen name="Reviews" component={ReviewsScreen} options={{ title: 'Reviews' }} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
    <Stack.Screen name="PaymentHistory" component={PaymentHistoryScreen} options={{ title: 'Payment Details' }} />
  </Stack.Navigator>
);

const AdminStack = () => (
  <Stack.Navigator
    initialRouteName="AdminDashboard"
    screenOptions={{
      headerStyle: { backgroundColor: theme.header },
      headerTintColor: '#fff',
      headerTitleStyle: { fontWeight: 'bold' }
    }}
  >
    <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ headerShown: false }} />
    <Stack.Screen name="FarmerApproval" component={FarmerApprovalScreen} options={{ title: 'Pending Approvals' }} />
    <Stack.Screen name="ManageFarmers" component={ManageFarmersScreen} options={{ title: 'Manage Farmers' }} />
    <Stack.Screen name="ManageCategories" component={ManageCategoriesScreen} options={{ title: 'Manage Categories' }} />
    <Stack.Screen
      name="AdminOrders"
      component={AdminOrdersScreenFixed}
      options={({ navigation }) => ({
        title: 'All Orders',
        headerRight: () => adminDashboardHeaderButton(navigation)
      })}
    />
    <Stack.Screen
      name="AdminOrderDetail"
      component={AdminOrderDetailScreen}
      options={({ navigation }) => ({
        title: 'Order',
        headerRight: () => adminDashboardHeaderButton(navigation)
      })}
    />
    <Stack.Screen name="AdminDeliveries" component={AdminDeliveriesScreen} options={{ title: 'Deliveries' }} />
    <Stack.Screen name="DeliveryDetail" component={DeliveryDetailScreen} options={{ title: 'Delivery Details' }} />
    <Stack.Screen name="AdminPayments" component={AdminPaymentScreen} options={{ title: 'Payments' }} />
    <Stack.Screen name="PaymentDetail" component={PaymentDetailScreen} options={{ title: 'Payment Detail' }} />
    <Stack.Screen name="AdminReviews" component={AdminReviewsScreen} options={{ title: 'Reviews' }} />
    <Stack.Screen name="AdminReports" component={AdminReportsScreen} options={{ title: 'Reports' }} />
    <Stack.Screen name="Reviews" component={ReviewsScreen} options={{ title: 'Reviews' }} />
    <Stack.Screen name="Marketplace" component={MarketplaceScreen} options={{ title: 'Marketplace (Admin)' }} />
    <Stack.Screen name="EditStock" component={EditStockScreen} options={{ title: 'Edit Stock' }} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
  </Stack.Navigator>
);

const DeliveryAgentStack = () => (
  <Stack.Navigator
    initialRouteName="DeliveryDashboard"
    screenOptions={{
      headerStyle: { backgroundColor: theme.header },
      headerTintColor: '#fff',
      headerTitleStyle: { fontWeight: 'bold' }
    }}
  >
    <Stack.Screen name="DeliveryDashboard" component={DeliveryDashboardScreen} options={{ title: 'My Deliveries' }} />
    <Stack.Screen name="AgentDeliveries" component={AgentDeliveriesScreen} options={{ title: 'All My Deliveries' }} />
    <Stack.Screen name="AgentDeliveryDetail" component={AgentDeliveryDetailScreen} options={{ title: 'Delivery Detail' }} />
    <Stack.Screen name="DeliveryHistory" component={DeliveryHistoryScreen} options={{ title: 'History' }} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
  </Stack.Navigator>
);

const CustomerStack = () => (
  <Stack.Navigator
    initialRouteName="Marketplace"
    screenOptions={{
      headerStyle: { backgroundColor: theme.header },
      headerTintColor: '#fff',
      headerTitleStyle: { fontWeight: 'bold' }
    }}
  >
    <Stack.Screen name="Marketplace" component={MarketplaceScreen} options={{ title: 'Fresh Marketplace' }} />
    <Stack.Screen name="Cart" component={CartScreen} options={{ title: 'My Cart' }} />
    <Stack.Screen name="CustomerOrders" component={CustomerOrdersScreen} options={{ title: 'My Orders' }} />
    <Stack.Screen name="CustomerOrderDetail" component={CustomerOrderDetailScreen} options={{ title: 'Order' }} />
    <Stack.Screen name="DeliveryDetail" component={DeliveryDetailScreen} options={{ title: 'Track Delivery' }} />
    <Stack.Screen name="Reviews" component={ReviewsScreen} options={{ title: 'Reviews' }} />
    <Stack.Screen name="PlaceOrder" component={PlaceOrderScreen} options={{ title: 'Place Order' }} />
    <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: 'Order Details' }} />
    <Stack.Screen name="Payment" component={PaymentScreen} options={{ title: 'Payment' }} />
    <Stack.Screen name="PaymentReceipt" component={PaymentReceiptScreen} options={{ title: 'Receipt', headerShown: false }} />
    <Stack.Screen name="PaymentDetail" component={PaymentDetailScreen} options={{ title: 'Payment Detail' }} />
    <Stack.Screen name="PaymentHistory" component={CustomerPaymentHistoryScreen} options={{ title: 'Payment History' }} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
  </Stack.Navigator>
);

const AuthStack = () => (
  <Stack.Navigator initialRouteName="Landing" screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Landing" component={LandingScreen} />
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

const MainNavigation = () => {
  const { user, loading } = useContext(AuthContext);
  const normalizedRole = (user?.role || '').toString().trim().toLowerCase();

  if (loading) {
    return (
      <View style={styles.appShell}>
        <View style={[styles.stackArea, styles.centered]}>
          <ActivityIndicator size="large" color={theme.spinner} />
        </View>
        <AppFooter />
      </View>
    );
  }

// Remount the tree when auth/role changes so the correct stack shows (avoids getting stuck on Login after a successful sign-in).
  const navKey = user
    ? `app-${normalizedRole || 'unknown'}-${user._id || user.id || 'u'}`
    : 'auth';

  return (
    <View style={styles.appShell}>
      <View style={styles.stackArea}>
        <NavigationContainer key={navKey}>
          {user ? (
            normalizedRole === 'admin' ? <AdminStack /> :
            normalizedRole === 'farmer' ? <FarmerStack /> :
            normalizedRole === 'customer' ? <CustomerStack /> :
            normalizedRole === 'deliveryagent' ? <DeliveryAgentStack /> :
            <AuthStack />
          ) : (
            <AuthStack />
          )}
        </NavigationContainer>
      </View>
      <AppFooter />
    </View>
  );
};

const AppNavigator = () => {
  return (
    <AuthProvider>
      <NotificationProvider>
        <CartProvider>
          <MainNavigation />
        </CartProvider>
      </NotificationProvider>
    </AuthProvider>
  );
};

const styles = StyleSheet.create({
  appShell: {
    flex: 1,
    backgroundColor: theme.primaryBg
  },
  stackArea: {
    flex: 1
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center'
  }
});

export default AppNavigator;
