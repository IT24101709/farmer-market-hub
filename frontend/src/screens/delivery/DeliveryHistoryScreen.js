import React, { useCallback, useContext, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import { getDeliveryHistory } from '../../services/deliveryService';

const formatDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch { return '—'; }
};

const statusColor = (status) => {
  switch (status) {
    case 'Pending': return '#ca8a04';
    case 'In Transit': return '#15803d';
    case 'Delivered': return '#15803d';
    case 'Cancelled': return '#b91c1c';
    default: return '#64748b';
  }
};

const DeliveryHistoryScreen = ({ navigation }) => {
  const { token } = useContext(AuthContext);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const load = async (refresh = false) => {
    try {
      if (!token) return;
      const p = refresh ? 1 : page;
      const res = await getDeliveryHistory(token, p, 20);
      
      if (refresh) {
        setHistory(res.data || []);
      } else {
        setHistory(prev => [...prev, ...(res.data || [])]);
      }
      
      setHasMore(res.pagination?.page < res.pagination?.pages);
      setPage(p + 1);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load(true);
    }, [token])
  );

  const loadMore = () => {
    if (!loading && !refreshing && hasMore) {
      setRefreshing(true);
      load(false);
    }
  };

  const renderDay = ({ item }) => {
    const day = new Date(item.date).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    
    const completed = item.completedDeliveries || 0;
    const total = item.totalDeliveries || item.deliveries?.length || 0;

    return (
      <View style={styles.dayCard}>
        <Text style={styles.dayHeader}>{day}</Text>
        <Text style={styles.dayStats}>
          {completed} of {total} delivered
        </Text>
        
        {item.deliveries?.map((delivery, idx) => (
          <View key={idx} style={styles.deliveryItem}>
            <View style={styles.deliveryLeft}>
              <Text style={styles.orderRef}>#{String(delivery.orderId).slice(-8).toUpperCase()}</Text>
              <Text style={styles.customer}>{delivery.customerName}</Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: `${statusColor(delivery.status)}22` }]}>
              <Text style={[styles.statusText, { color: statusColor(delivery.status) }]}>
                {delivery.status}
              </Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#15803d" />
        <Text style={styles.loadingText}>Loading history...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={history}
        keyExtractor={(item) => item._id || String(item.date)}
        renderItem={renderDay}
        contentContainerStyle={styles.list}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(true); }}
          />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>No delivery history yet.</Text>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0fdf4' },
  loadingText: { marginTop: 10, color: '#166534', fontWeight: '700' },
  list: { padding: 16, paddingBottom: 40 },
  dayCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#d1fae5'
  },
  dayHeader: { fontSize: 16, fontWeight: '800', color: '#14532d', marginBottom: 4 },
  dayStats: { fontSize: 14, color: '#64748b', marginBottom: 12 },
  deliveryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0fdf4'
  },
  deliveryLeft: { flex: 1 },
  orderRef: { fontSize: 14, fontWeight: '700', color: '#333' },
  customer: { fontSize: 13, color: '#64748b', marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontWeight: '700', fontSize: 11 },
  empty: { textAlign: 'center', color: '#64748b', marginTop: 40, fontWeight: '600' }
});

export default DeliveryHistoryScreen;
