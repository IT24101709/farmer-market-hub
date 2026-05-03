import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getStockById, deleteStock } from '../services/stockService';
import { AuthContext } from '../context/AuthContext';
import { resolveStockImageUrl } from '../config';

const riskColors = {
  critical: { bg: '#fee2e2', fg: '#991b1b' },
  high: { bg: '#ffedd5', fg: '#c2410c' },
  medium: { bg: '#fef9c3', fg: '#a16207' },
  low: { bg: '#ecfdf5', fg: '#166534' }
};

const StockDetailScreen = ({ route, navigation }) => {
  const { token, logout } = React.useContext(AuthContext);
  const { stockId: routeStockId } = route.params;
  const [stock, setStock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const fetchStockDetail = useCallback(async () => {
    if (!token) {
      setStock(null);
      setLoading(false);
      return;
    }
    try {
      const idToLoad = routeStockId || route.params?.stock?._id;
      if (!idToLoad) {
        throw new Error('Missing stock id');
      }
      const data = await getStockById(idToLoad, token);
      setStock(data);
    } catch (error) {
      console.error(error);
      if (error.status === 401) logout();
      Alert.alert('Error', error.message || 'Could not load stock details.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [routeStockId, route.params, token, logout, navigation]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchStockDetail();
    }, [fetchStockDetail])
  );

  const handleDelete = () => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to remove this stock from the market?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              const idToDelete = routeStockId || stock?._id;
              if (!idToDelete) throw new Error('Missing stock id');
              await deleteStock(idToDelete, token);
              Alert.alert('Success', 'Stock removed successfully.');
              navigation.replace('StockList');
            } catch (error) {
              if (error.status === 401) logout();
              Alert.alert('Error', error.message || 'Failed to delete stock.');
            } finally {
              setDeleting(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#15803d" />
      </View>
    );
  }

  if (!stock) return null;

  const isAvailable = stock.status === 'Available';
  const imageUrl = resolveStockImageUrl(stock);

  const displayName = stock.name || stock.vegetableName || 'Stock';
  const riskLevel = String(stock.spoilageRiskLevel || 'low').toLowerCase();
  const rc = riskColors[riskLevel] || riskColors.low;
  const daysLeft =
    stock.daysLeft !== undefined && stock.daysLeft !== null ? stock.daysLeft : null;
  const wastageValue = Number(
    stock.estimatedWastageValue != null
      ? stock.estimatedWastageValue
      : Number(stock.quantity || 0) * Number(stock.pricePerKg || 0)
  );

  const formattedDate = new Date(stock.expiryDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <ScrollView style={styles.container}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.heroImage} resizeMode="cover" />
      ) : (
        <View style={[styles.heroImage, styles.imagePlaceholder]} />
      )}

      <View style={styles.contentContainer}>
        <View style={styles.headerInfo}>
          <Text style={styles.title}>{displayName}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: isAvailable ? '#E8F5E9' : '#FFF3E0' }
            ]}
          >
            <Text
              style={[styles.statusText, { color: isAvailable ? '#2E7D32' : '#E65100' }]}
            >
              {stock.status}
            </Text>
          </View>
        </View>

        <View style={[styles.riskBanner, { backgroundColor: rc.bg }]}>
          <Text style={[styles.riskTitle, { color: rc.fg }]}>Spoilage risk: {riskLevel.toUpperCase()}</Text>
          <Text style={[styles.riskSub, { color: rc.fg }]}>
            {daysLeft !== null
              ? `${daysLeft} day(s) to expiry · potential exposure LKR ${wastageValue.toFixed(2)}`
              : `Potential exposure LKR ${wastageValue.toFixed(2)}`}
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Price per kg</Text>
            <Text style={styles.detailValuePrice}>LKR {Number(stock.pricePerKg || 0).toFixed(2)}</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Available quantity</Text>
            <Text style={styles.detailValue}>
              {stock.quantity} {stock.unit || 'kg'}
            </Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Expiry date</Text>
            <Text style={styles.detailValue}>{formattedDate}</Text>
          </View>
        </View>

        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.button, styles.editButton]}
            onPress={() =>
              navigation.navigate('EditStock', {
                stock,
                stockId: routeStockId || stock?._id
              })
            }
          >
            <Text style={styles.editButtonText}>Edit details</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.deleteButton]}
            onPress={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.deleteButtonText}>Remove stock</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0fdf4'
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  heroImage: {
    width: '100%',
    height: 250,
    backgroundColor: '#E0E0E0'
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  contentContainer: {
    padding: 20,
    marginTop: -20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: '#f0fdf4'
  },
  headerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#212121',
    flex: 1
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 10
  },
  statusText: {
    fontWeight: 'bold',
    fontSize: 14
  },
  riskBanner: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 16
  },
  riskTitle: {
    fontSize: 16,
    fontWeight: '800'
  },
  riskSub: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.95
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10
  },
  detailLabel: {
    fontSize: 16,
    color: '#757575'
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121'
  },
  detailValuePrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#15803d'
  },
  divider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginVertical: 5
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15
  },
  button: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  editButton: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#15803d'
  },
  editButtonText: {
    color: '#2E7D32',
    fontSize: 16,
    fontWeight: 'bold'
  },
  deleteButton: {
    backgroundColor: '#F44336'
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold'
  }
});

export default StockDetailScreen;
