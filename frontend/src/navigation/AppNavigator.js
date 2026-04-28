import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, AuthContext } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';
import { ActivityIndicator, View } from 'react-native';

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
import BulkOperationsScreen from '../screens/farmer/BulkOperationsScreen';
import MarketplaceScreen from '../screens/customer/MarketplaceScreen';
import CartScreen from '../screens/customer/CartScreen';
import LandingScreen from '../screens/public/LandingScreen';

const Stack = createNativeStackNavigator();

const FarmerStack = () => (
  <Stack.Navigator 
    initialRouteName="FarmerDashboard"
    screenOptions={{
      headerStyle: { backgroundColor: '#4CAF50' },
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
    <Stack.Screen name="BulkOperations" component={BulkOperationsScreen} options={{ title: 'Bulk Operations' }} />
  </Stack.Navigator>
);

const AdminStack = () => (
  <Stack.Navigator
    initialRouteName="AdminDashboard"
    screenOptions={{
      headerStyle: { backgroundColor: '#FF9800' },
      headerTintColor: '#fff',
      headerTitleStyle: { fontWeight: 'bold' }
    }}
  >
    <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ headerShown: false }} />
    <Stack.Screen name="FarmerApproval" component={FarmerApprovalScreen} options={{ title: 'Pending Approvals' }} />
    <Stack.Screen name="ManageFarmers" component={ManageFarmersScreen} options={{ title: 'Manage Farmers' }} />
    <Stack.Screen name="ManageCategories" component={ManageCategoriesScreen} options={{ title: 'Manage Categories' }} />
  </Stack.Navigator>
);

const CustomerStack = () => (
  <Stack.Navigator
    initialRouteName="Marketplace"
    screenOptions={{
      headerStyle: { backgroundColor: '#2196F3' },
      headerTintColor: '#fff',
      headerTitleStyle: { fontWeight: 'bold' }
    }}
  >
    <Stack.Screen name="Marketplace" component={MarketplaceScreen} options={{ title: 'Fresh Marketplace' }} />
    <Stack.Screen name="Cart" component={CartScreen} options={{ title: 'My Cart' }} />
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

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? (
        user.role === 'Admin' ? <AdminStack /> :
        user.role === 'Farmer' ? <FarmerStack /> :
        <CustomerStack />
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
};

const AppNavigator = () => {
  return (
    <AuthProvider>
      <CartProvider>
        <MainNavigation />
      </CartProvider>
    </AuthProvider>
  );
};

export default AppNavigator;
