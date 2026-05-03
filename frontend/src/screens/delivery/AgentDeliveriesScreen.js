import React, { useCallback, useContext, useState } from 'react';
import {
  ActivityIndicator,
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
import { getMyDeliveries } from '../../services/deliveryService';

const statusColors = {
  pending: '#ca8a04',
  assigned: '#047857',
  'in-transit': '#15803d',
  delivered: '#15803d',
  cancelled: '#b91c1c'
};

const getStatusColor = (status) => statusColors[status] || '#64748b';

const formatDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '—';
  }
};

const AgentDeliveriesScreen = ({ navigation }) => {
  const { token, logout } = useContext(AuthContext);
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      if (!token) return;
      const res = await getMyDeliveries(token);
      setDeliveries(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      if (e?.status === 401) logout();
      setDeliveries([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [token])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const getNextStatus = (currentStatus) => {
    const transitions = {
      assigned: 'in-transit',
      'in-transit': 'delivered'
    };
    return transitions[currentStatus];
  };

  const getButtonLabel = (currentStatus) => {
    const labels = {
      assigned: 'Start Delivery',
      'in-transit': 'Mark Delivered'
    };
    return labels[currentStatus];
  };

  const renderDelivery = ({ item }) => {
    const shortId = item._id ? String(item._id).slice(-8).toUpperCase() : '—';
    const orderShortId = item.orderId?._id ? String(item.orderId._id).slice(-8).toUpperCase() : '—';
    const nextStatus = getNextStatus(item.status);
    const buttonLabel = getButtonLabel(item.status);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('AgentDeliveryDetail', { deliveryId: item._id })}
        activeOpacity={0.85}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.deliveryId}>#{shortId}</Text>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}22` }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status === 'in-transit' ? 'In Transit' : item.status || 'pending'}
            </Text>
          </View>
        </View>

        <Text style={styles.orderRef}>Order #{orderShortId}</Text>
        <Text style={styles.address} numberOfLines={2}>
          {item.deliveryAddress || 'No address'}
        </Text>

        <Text style={styles.date}>{formatDate(item.createdAt)}</Text>

        {nextStatus && buttonLabel && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('AgentDeliveryDetail', { deliveryId: item._id })}
          >
            <Text style={styles.actionBtnText}>{buttonLabel}</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#15803d" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={deliveries}
        keyExtractor={(item) => item._id}
        renderItem={renderDelivery}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.empty}>No deliveries assigned yet.</Text>
            <Text style={styles.emptyHint}>Check back later for new deliveries.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#d1fae5'
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  deliveryId: { fontSize: 16, fontWeight: '900', color: '#14532d' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontWeight: '800', fontSize: 12, textTransform: 'capitalize' },
  orderRef: { marginTop: 8, fontSize: 14, color: '#166534', fontWeight: '600' },
  address: { marginTop: 8, color: '#64748b', fontSize: 14 },
  date: { marginTop: 6, color: '#94a3b8', fontSize: 12, fontWeight: '600' },
  actionBtn: {
    marginTop: 14,
    backgroundColor: '#e8f5e9',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center'
  },
  actionBtnText: { color: '#2e7d32', fontWeight: '800', fontSize: 14 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  empty: { textAlign: 'center', color: '#64748b', fontSize: 16, fontWeight: '600' },
  emptyHint: { textAlign: 'center', color: '#94a3b8', marginTop: 8 }
});

export default AgentDeliveriesScreen;
