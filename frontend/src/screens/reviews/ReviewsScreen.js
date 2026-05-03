import React, { useCallback, useContext, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import { deleteReview, getReviews, saveReview, updateReview } from '../../services/reviewService';

const ratingOptions = [1, 2, 3, 4, 5];

const ReviewsScreen = ({ route }) => {
  const { stockId, farmerId, stockName, farmerName } = route.params || {};
  const { token, user, logout } = useContext(AuthContext);
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState({ count: 0, averageRating: 0 });
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const myReview = useMemo(() => {
    const userId = String(user?._id || user?.id || '');
    return reviews.find((review) => String(review.customerId?._id || review.customerId) === userId);
  }, [reviews, user]);

  const load = async () => {
    try {
      if (!token) return;
      const res = await getReviews(token, { stockId, farmerId });
      setReviews(Array.isArray(res.data) ? res.data : []);
      setSummary(res.summary || { count: 0, averageRating: 0 });
      const existing = (res.data || []).find((review) => {
        return String(review.customerId?._id || review.customerId) === String(user?._id || user?.id || '');
      });
      if (existing) {
        setRating(existing.rating);
        setComment(existing.comment || '');
      }
    } catch (e) {
      console.error(e);
      if (e?.status === 401) logout();
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [token, stockId, farmerId])
  );

  const submit = async () => {
    setSaving(true);
    try {
      if (myReview) {
        await updateReview(myReview._id, { rating, comment }, token);
      } else {
        await saveReview({ stockId, rating, comment }, token);
      }
      await load();
      const msg = myReview ? 'Review updated.' : 'Review submitted.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Success', msg);
    } catch (e) {
      const msg = e.message || 'Could not save review';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  const removeMine = async () => {
    if (!myReview) return;
    setSaving(true);
    try {
      await deleteReview(myReview._id, token);
      setRating(5);
      setComment('');
      await load();
    } catch (e) {
      const msg = e.message || 'Could not delete review';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  const renderReview = ({ item }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <Text style={styles.customer}>{item.customerId?.name || 'Customer'}</Text>
        <Text style={styles.stars}>{'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}</Text>
      </View>
      <Text style={styles.reviewText}>{item.comment || 'No comment provided.'}</Text>
      <Text style={styles.meta}>
        {item.stockId?.name || stockName || 'Vegetable'} · {item.farmerId?.name || farmerName || 'Farmer'}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#15803d" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{stockName || farmerName || 'Reviews'}</Text>
        <Text style={styles.summary}>
          {summary.averageRating.toFixed(1)} / 5 from {summary.count} review{summary.count === 1 ? '' : 's'}
        </Text>
      </View>

      {stockId && (user?.role || '').toLowerCase() === 'customer' && (
        <View style={styles.form}>
          <Text style={styles.formTitle}>{myReview ? 'Edit your review' : 'Write a review'}</Text>
          <View style={styles.ratingRow}>
            {ratingOptions.map((value) => (
              <TouchableOpacity key={value} style={styles.starButton} onPress={() => setRating(value)}>
                <Text style={[styles.star, value <= rating && styles.starActive]}>★</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.input}
            value={comment}
            onChangeText={setComment}
            placeholder="Share freshness, quality, and farmer experience..."
            placeholderTextColor="#94a3b8"
            multiline
          />
          <View style={styles.actions}>
            <TouchableOpacity style={[styles.submitButton, saving && styles.disabled]} onPress={submit} disabled={saving}>
              <Text style={styles.submitText}>{myReview ? 'Update Review' : 'Submit Review'}</Text>
            </TouchableOpacity>
            {myReview && (
              <TouchableOpacity style={[styles.deleteButton, saving && styles.disabled]} onPress={removeMine} disabled={saving}>
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <FlatList
        data={reviews.filter((review) => !review.isRemoved)}
        keyExtractor={(item) => item._id}
        renderItem={renderReview}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No reviews yet.</Text>}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0fdf4' },
  header: { padding: 18, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#d1fae5' },
  title: { fontSize: 22, fontWeight: '900', color: '#14532d' },
  summary: { marginTop: 6, color: '#166534', fontWeight: '700' },
  form: { margin: 14, padding: 14, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#bbf7d0' },
  formTitle: { fontWeight: '900', color: '#0f172a', marginBottom: 10 },
  ratingRow: { flexDirection: 'row', marginBottom: 10 },
  starButton: { marginRight: 8 },
  star: { fontSize: 28, color: '#cbd5e1' },
  starActive: { color: '#f59e0b' },
  input: {
    minHeight: 86,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 12,
    color: '#0f172a',
    backgroundColor: '#f8fafc'
  },
  actions: { flexDirection: 'row', marginTop: 12, gap: 10 },
  submitButton: { flex: 1, backgroundColor: '#15803d', paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
  submitText: { color: '#fff', fontWeight: '900' },
  deleteButton: { paddingHorizontal: 18, justifyContent: 'center', backgroundColor: '#fee2e2', borderRadius: 10 },
  deleteText: { color: '#991b1b', fontWeight: '900' },
  list: { padding: 14, paddingBottom: 40 },
  reviewCard: { backgroundColor: '#fff', padding: 14, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#d1fae5' },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  customer: { fontWeight: '900', color: '#111827' },
  stars: { color: '#f59e0b', fontWeight: '900' },
  reviewText: { marginTop: 8, color: '#334155', lineHeight: 20 },
  meta: { marginTop: 8, color: '#64748b', fontSize: 12, fontWeight: '700' },
  empty: { textAlign: 'center', color: '#64748b', marginTop: 30 },
  disabled: { opacity: 0.6 }
});

export default ReviewsScreen;
