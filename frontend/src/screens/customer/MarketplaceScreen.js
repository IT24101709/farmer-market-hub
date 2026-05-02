import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import { CartContext } from '../../context/CartContext';
import { NotificationContext } from '../../context/NotificationContext';
import { getMarketProducts } from '../../services/marketService';
import { resolveStockImageUrl } from '../../config';

const CATEGORY_CHIPS = [
  { label: 'All', value: '' },
  { label: 'Leafy greens', value: 'leafy-greens' },
  { label: 'Root veg', value: 'root-vegetables' },
  { label: 'Fruiting', value: 'fruiting' },
  { label: 'Gourds', value: 'gourds' },
  { label: 'Beans & pods', value: 'beans-pods' },
  { label: 'Bulbs & stems', value: 'bulbs-stems' },
  { label: 'Herbs & spices', value: 'herbs-spices' },
  { label: 'Other', value: 'other' }
];

const imageUrlForProduct = (item) => resolveStockImageUrl(item);

const MarketplaceScreen = ({ navigation }) => {
  const { token, logout } = useContext(AuthContext);
  const { addToCart, cartItems } = useContext(CartContext);
  const { unreadCount } = useContext(NotificationContext);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const fetchProducts = async (pageNum = 1, isRefresh = false) => {
    try {
      if (!token) {
        setProducts([]);
        setHasMore(false);
        return;
      }
      if (pageNum === 1) setLoading(true);

      const params = {
        page: pageNum,
        limit: 10,
        search: searchQuery.trim() || undefined,
        category: categoryFilter || undefined,
        minPrice: minPrice.trim() ? Number(minPrice) : undefined,
        maxPrice: maxPrice.trim() ? Number(maxPrice) : undefined
      };

      const data = await getMarketProducts(params, token);

      if (isRefresh || pageNum === 1) {
        setProducts(data.products || []);
      } else {
        setProducts((prev) => [...prev, ...(data.products || [])]);
      }

      const totalPages = data.pagination?.totalPages ?? 1;
      setHasMore(pageNum < totalPages);
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching market products:', error);
      if (error.status === 401) logout();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProducts(1, true);
  }, [searchQuery, categoryFilter, minPrice, maxPrice, token]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts(1, true);
  };

  const loadMore = () => {
    if (hasMore && !loading && !refreshing) {
      fetchProducts(page + 1);
    }
  };

  const renderFooter = () => {
    if (!hasMore) return null;
    return (
      <View style={{ paddingVertical: 20 }}>
        <ActivityIndicator size="small" color="#4CAF50" />
      </View>
    );
  };

  const renderProduct = ({ item }) => {
    const stockShortId = item._id ? item._id.substring(item._id.length - 6).toUpperCase() : 'N/A';
    const farmerShortId = item.farmerId?._id
      ? item.farmerId._id.substring(item.farmerId._id.length - 6).toUpperCase()
      : 'N/A';
    const farmerName = item.farmerId?.name || 'Unknown Farmer';
    const title = item.name || item.vegetableName || 'Produce';
    const imageUri = imageUrlForProduct(item);

    return (
      <View style={styles.card}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={[styles.cardImage, styles.imagePlaceholder]} />
        )}
        <View style={styles.cardContent}>
          <View style={styles.titleRow}>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.priceTag}>LKR {Number(item.pricePerKg || 0).toFixed(2)}/kg</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Stock ID:</Text>
            <Text style={styles.infoValueBadge}>#{stockShortId}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Farmer:</Text>
            <View style={styles.farmerContainer}>
              <Text style={styles.farmerName}>{farmerName}</Text>
              <Text style={styles.farmerId}> (ID: {farmerShortId})</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Available:</Text>
            <Text style={styles.quantityValue}>
              {item.quantity} {item.unit || 'kg'}
            </Text>
          </View>

          <TouchableOpacity style={styles.buyButton} onPress={() => addToCart(item)}>
            <Text style={styles.buyButtonText}>Add to Cart</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Fresh Market</Text>
          <Text style={styles.headerSubtitle}>Discover local produce</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.ordersBtn} onPress={() => navigation.navigate('CustomerOrders')}>
            <Text style={styles.ordersBtnText}>Orders</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.notifBtn} onPress={() => navigation.navigate('Notifications')}>
            <Text style={styles.notifBtnText}>Alerts</Text>
            {unreadCount > 0 ? (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cartBtn} onPress={() => navigation.navigate('Cart')}>
            <Text style={styles.cartText}>Cart ({cartItems.length})</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search vegetables..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {CATEGORY_CHIPS.map((chip) => {
            const active = categoryFilter === chip.value;
            return (
              <TouchableOpacity
                key={chip.label}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setCategoryFilter(chip.value)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{chip.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <View style={styles.priceFilterRow}>
          <TextInput
            style={styles.priceInput}
            placeholder="Min LKR"
            placeholderTextColor="#999"
            keyboardType="decimal-pad"
            value={minPrice}
            onChangeText={setMinPrice}
          />
          <Text style={styles.priceDash}>–</Text>
          <TextInput
            style={styles.priceInput}
            placeholder="Max LKR"
            placeholderTextColor="#999"
            keyboardType="decimal-pad"
            value={maxPrice}
            onChangeText={setMaxPrice}
          />
        </View>
      </View>

      {!token ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Sign in as a customer to browse the marketplace.</Text>
        </View>
      ) : loading && page === 1 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      ) : products.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No products match your filters. Try clearing search or category.</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => item._id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4CAF50']} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#757575',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    maxWidth: '62%'
  },
  ordersBtn: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 6,
    marginBottom: 4
  },
  ordersBtnText: {
    color: '#2E7D32',
    fontWeight: 'bold',
    fontSize: 12
  },
  notifBtn: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 6,
    marginBottom: 4,
    position: 'relative'
  },
  notifBtnText: {
    color: '#E65100',
    fontWeight: 'bold',
    fontSize: 12
  },
  notifBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#D32F2F',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4
  },
  notifBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900'
  },
  cartBtn: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  cartText: {
    color: '#1976D2',
    fontWeight: 'bold',
    fontSize: 14,
  },
  logoutBtn: {
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  logoutText: {
    color: '#D32F2F',
    fontWeight: 'bold',
    fontSize: 14,
  },
  searchContainer: {
    padding: 15,
    backgroundColor: '#FFFFFF',
  },
  searchInput: {
    backgroundColor: '#F5F7FA',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  chipScroll: {
    marginTop: 12
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ECEFF1',
    marginRight: 8
  },
  chipActive: {
    backgroundColor: '#C8E6C9'
  },
  chipText: {
    color: '#424242',
    fontWeight: '600',
    fontSize: 13
  },
  chipTextActive: {
    color: '#1B5E20'
  },
  priceFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8
  },
  priceInput: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    fontSize: 14,
    color: '#333'
  },
  priceDash: {
    color: '#757575',
    fontWeight: '700'
  },
  imagePlaceholder: {
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center'
  },
  listContainer: {
    padding: 15,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    marginBottom: 20,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#EEEEEE',
  },
  cardContent: {
    padding: 15,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212121',
    flex: 1,
  },
  priceTag: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    width: 70,
    fontSize: 14,
    color: '#757575',
    fontWeight: '500',
  },
  infoValueBadge: {
    backgroundColor: '#E3F2FD',
    color: '#1976D2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 'bold',
    overflow: 'hidden',
  },
  farmerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  farmerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#424242',
  },
  farmerId: {
    fontSize: 13,
    color: '#9E9E9E',
  },
  quantityValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#E65100',
  },
  buyButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 15,
  },
  buyButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#757575',
    marginTop: 20,
  }
});

export default MarketplaceScreen;
