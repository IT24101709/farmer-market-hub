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
  SafeAreaView
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import { getMarketProducts } from '../../services/marketService';
import getEnvVars from '../../config';

const { apiUrl } = getEnvVars();

const MarketplaceScreen = ({ navigation }) => {
  const { user, logout } = useContext(AuthContext);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchProducts = async (pageNum = 1, isRefresh = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      
      const data = await getMarketProducts({
        page: pageNum,
        limit: 10,
        search: searchQuery
      });

      if (isRefresh || pageNum === 1) {
        setProducts(data.products);
      } else {
        setProducts(prev => [...prev, ...data.products]);
      }

      setHasMore(pageNum < data.pagination.totalPages);
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching market products:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProducts(1, true);
  }, [searchQuery]);

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
    // Generate readable short IDs
    const stockShortId = item._id ? item._id.substring(item._id.length - 6).toUpperCase() : 'N/A';
    const farmerShortId = item.farmerId?._id 
      ? item.farmerId._id.substring(item.farmerId._id.length - 6).toUpperCase() 
      : 'N/A';
    const farmerName = item.farmerId?.name || 'Unknown Farmer';

    const imageUrl = item.image.startsWith('http') 
        ? item.image 
        : `${apiUrl.replace('/api', '')}${item.image}`;

    return (
      <View style={styles.card}>
        <Image 
          source={{ uri: imageUrl }} 
          style={styles.cardImage} 
          resizeMode="cover"
        />
        <View style={styles.cardContent}>
          <View style={styles.titleRow}>
            <Text style={styles.cardTitle}>{item.vegetableName}</Text>
            <Text style={styles.priceTag}>LKR {item.pricePerKg}/kg</Text>
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
            <Text style={styles.quantityValue}>{item.quantity} kg</Text>
          </View>

          <TouchableOpacity style={styles.buyButton}>
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
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search vegetables..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {loading && page === 1 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      ) : products.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No products found in the market.</Text>
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
    borderColor: '#E0E0E0',
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
