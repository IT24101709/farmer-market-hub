import React, { useContext } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AuthContext } from '../context/AuthContext';

const NAV_ITEMS = [
  { label: 'Dashboard', screen: 'FarmerDashboard' },
  { label: 'Notifications', screen: 'FarmerNotifications' },
  { label: 'Add Stock', screen: 'AddStock' },
  { label: 'View Stock', screen: 'StockList' },
  { label: 'Orders', screen: 'MyOrders' },
  { label: 'Payment Details', screen: 'PaymentHistory' },
  { label: 'Reviews', screen: 'Reviews' },
  { label: 'Profile', screen: 'FarmerProfile' }
];

const FarmerNavBar = ({ navigation, currentScreen }) => {
  const { user } = useContext(AuthContext);

  const handleNavigation = (item) => {
    if (item.screen === 'Reviews') {
      navigation.navigate('Reviews', {
        farmerId: user?._id || user?.id,
        farmerName: user?.name || 'My Farm'
      });
      return;
    }
    navigation.navigate(item.screen);
  };

  return (
    <View style={styles.navBar}>
      <View style={styles.brandPill}>
        <Text style={styles.brandIcon}>🌱</Text>
        <Text style={styles.brandText}>Stock Manager</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.navTabs}>
        {NAV_ITEMS.map((item) => {
          const active = item.screen === currentScreen;
          return (
            <TouchableOpacity
              key={item.label}
              style={[styles.navTab, active && styles.navTabActive]}
              onPress={() => handleNavigation(item)}
            >
              <Text style={[styles.navTabText, active && styles.navTabTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  navBar: {
    minHeight: 76,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(129, 211, 166, 0.92)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.35)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14
  },
  brandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.58)'
  },
  brandIcon: {
    color: '#15803d',
    fontWeight: '900',
    fontSize: 11
  },
  brandText: {
    color: '#13713a',
    fontSize: 18,
    fontWeight: '900'
  },
  navTabs: {
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 8
  },
  navTab: {
    minWidth: 96,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center'
  },
  navTabActive: {
    backgroundColor: '#ffffff'
  },
  navTabText: {
    color: 'rgba(255, 255, 255, 0.92)',
    fontWeight: '800'
  },
  navTabTextActive: {
    color: '#15803d'
  }
});

export default FarmerNavBar;
export { NAV_ITEMS };
