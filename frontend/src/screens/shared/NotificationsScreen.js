import React, { useContext, useCallback } from 'react';
import {
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import { NotificationContext } from '../../context/NotificationContext';

const NotificationsScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const { notifications, refreshNotifications, markAsRead, markAllAsRead, unreadCount } =
    useContext(NotificationContext);

  useFocusEffect(
    useCallback(() => {
      refreshNotifications();
    }, [refreshNotifications])
  );

  const openOrder = (orderId) => {
    if (!orderId) return;
    const role = (user?.role || '').toLowerCase();
    if (role === 'customer') {
      navigation.navigate('CustomerOrderDetail', { orderId: String(orderId) });
    } else if (role === 'farmer') {
      navigation.navigate('OrderDetails', { orderId: String(orderId) });
    } else if (role === 'admin') {
      navigation.navigate('AdminOrderDetail', { orderId: String(orderId) });
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.row, !item.read && styles.rowUnread]}
      onPress={() => {
        markAsRead(item._id);
        if (item.orderId) openOrder(item.orderId);
      }}
    >
      <View style={styles.rowText}>
        <Text style={styles.title}>{item.title}</Text>
        {item.body ? <Text style={styles.body}>{item.body}</Text> : null}
        <Text style={styles.time}>
          {item.createdAt ? new Date(item.createdAt).toLocaleString('en-GB') : ''}
        </Text>
      </View>
      {!item.read ? <View style={styles.badge} /> : null}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={styles.markAll}>Mark all read</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refreshNotifications} />}
        ListEmptyComponent={<Text style={styles.empty}>No notifications yet. Order updates appear here.</Text>}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  markAll: { color: '#2563eb', fontWeight: '800', fontSize: 14 },
  list: { paddingBottom: 32 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#fff'
  },
  rowUnread: { backgroundColor: '#eff6ff' },
  rowText: { flex: 1, paddingRight: 8 },
  title: { fontSize: 16, fontWeight: '800', color: '#111827' },
  body: { marginTop: 6, color: '#475569', fontWeight: '600', fontSize: 14 },
  time: { marginTop: 8, fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  badge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563eb',
    marginTop: 6
  },
  empty: { textAlign: 'center', color: '#64748b', marginTop: 48, fontWeight: '600', paddingHorizontal: 24 }
});

export default NotificationsScreen;
