import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Screens
import StockListScreen from '../screens/StockListScreen';
import AddStockScreen from '../screens/AddStockScreen';
import EditStockScreen from '../screens/EditStockScreen';
import StockDetailScreen from '../screens/StockDetailScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="StockList"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#4CAF50',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen 
          name="StockList" 
          component={StockListScreen} 
          options={{ title: 'My Harvest' }}
        />
        <Stack.Screen 
          name="AddStock" 
          component={AddStockScreen} 
          options={{ title: 'Add New Vegetable' }}
        />
        <Stack.Screen 
          name="StockDetail" 
          component={StockDetailScreen} 
          options={{ title: 'Stock Details' }}
        />
        <Stack.Screen 
          name="EditStock" 
          component={EditStockScreen} 
          options={{ title: 'Edit Stock' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
