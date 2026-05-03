import React, { useCallback, useContext, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import { getReviews, removeReviewAsAdmin } from '../../services/reviewService';

const AdminReviewsScreen = () => {
  const { token, logout } = useContext(AuthContext);
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState({ count: 0, averageRating: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reason, setReason] = useState('Inappropriate review');
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    try {
      if (!token) return;
      const res = await getReviews(token, { includeRemoved: true });
      setReviews(Array.isArray(res.data) ? res.data : []);
      setSummary(res.summary || { count: 0, averageRating: 0 });
    } catch (e) {
      console.error(e);
      if (e?.status === 401) logout();
      setReviews([]);
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

  const showMessage = (title, message) => {
    if (Platform.OS === 'web') window.alert(message || title);
    else Alert.alert(title, message);
  };

  const removeReview = async (review) => {
    const run = async () => {
      setBusyId(review._id);
      try {
        await removeReviewAsAdmin(review._id, reason, token);
        await load();
        showMessage('Removed', 'Review removed from public listings.');
      } catch (e) {
        showMessage('Error', e.message || 'Could not remove review.');
      } finally {
        setBusyId(null);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Remove this review from public listings?')) run();
      return;
    }
    Alert.alert('Remove review', 'Remove this review from public listings?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: run }
    ]);
  };

  const renderReview = ({ item }) => {
    const removed = item.isRemoved;
    return (
      <View style={[styles.card, removed && styles.removedCard]}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.customer}>{item.customerId?.name || 'Customer'}</Text>
            <Text style={styles.meta}>
              {item.stockId?.name || 'Vegetable'} · {item.farmerId?.name || 'Farmer'}
            </Text>
          </View>
          <Text style={styles.stars}>{'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}</Text>
        </View>
        <Text style={styles.comment}>{item.comment || 'No comment provided.'}</Text>
        {removed ? (
          <Text style={styles.removedText}>Removed: {item.removalReason || 'No reason provided'}</Text>
        ) : (
          <TouchableOpacity
            style={[styles.removeBtn, busyId === item._id && styles.disabled]}
            onPress={() => removeReview(item)}
            disabled={busyId === item._id}
          >
            <Text style={styles.removeText}>Remove Review</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#166534" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Review Moderation</Text>
        <Text style={styles.summary}>
          Public average {Number(summary.averageRating || 0).toFixed(1)} from {summary.count || 0} reviews
        </Text>
        <TextInput
          style={styles.reasonInput}
          value={reason}
          onChangeText={setReason}
          placeholder="Removal reason"
          placeholderTextColor="#9ca3af"
        />
      </View>
      <FlatList
        data={reviews}
        keyExtractor={(item) => item._id}
        renderItem={renderReview}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListEmptyComponent={<Text style={styles.empty}>No reviews found.</Text>}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff8f0' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff8f0' },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ffe0b2' },
  title: { fontSize: 22, fontWeight: '900', color: '#e65100' },
  summary: { marginTop: 6, color: '#7c2d12', fontWeight: '700' },
  reasonInput: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#ffcc80',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#fffaf3',
    color: '#111827'
  },
  list: { padding: 14, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#ffe0b2' },
  removedCard: { opacity: 0.7, backgroundColor: '#f8fafc', borderColor: '#e5e7eb' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  customer: { fontWeight: '900', color: '#111827' },
  meta: { marginTop: 4, color: '#64748b', fontWeight: '700', fontSize: 12 },
  stars: { color: '#f59e0b', fontWeight: '900' },
  comment: { marginTop: 10, color: '#334155', lineHeight: 20 },
  removeBtn: { marginTop: 12, paddingVertical: 10, backgroundColor: '#fee2e2', borderRadius: 8, alignItems: 'center' },
  removeText: { color: '#991b1b', fontWeight: '900' },
  removedText: { marginTop: 10, color: '#991b1b', fontWeight: '800' },
  empty: { textAlign: 'center', color: '#64748b', marginTop: 40 },
  disabled: { opacity: 0.6 }
});

export default AdminReviewsScreen;
