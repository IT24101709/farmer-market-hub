import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const ADMIN_NAV_ITEMS = [
  { label: 'Dashboard', screen: 'AdminDashboard' },
  { label: 'Approve Farmers', screen: 'FarmerApproval' },
  { label: 'Manage Farmers', screen: 'ManageFarmers' },
  { label: 'Categories', screen: 'ManageCategories' },
  { label: 'All Orders', screen: 'AdminOrders' },
  { label: 'Reviews', screen: 'AdminReviews' },
  { label: 'Reports', screen: 'AdminReports' },
  { label: 'Deliveries', screen: 'AdminDeliveries' },
  { label: 'Payments', screen: 'AdminPayments' },
  { label: 'Marketplace', screen: 'Marketplace' },
  { label: 'Notifications', screen: 'Notifications' }
];

const AdminNavBar = ({ navigation, currentScreen }) => {
  return (
    <View style={styles.navBar}>
      <View style={styles.brandPill}>
        <Text style={styles.brandIcon}>A</Text>
        <Text style={styles.brandText}>Admin Panel</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.navTabs}>
        {ADMIN_NAV_ITEMS.map((item) => {
          const active = item.screen === currentScreen;
          return (
            <TouchableOpacity
              key={item.label}
              style={[styles.navTab, active && styles.navTabActive]}
              onPress={() => navigation.navigate(item.screen)}
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
    fontSize: 11,
    marginRight: 6
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

export default AdminNavBar;
export { ADMIN_NAV_ITEMS };
