import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator,
  TextInput
} from 'react-native';
import { getMyStocks } from '../services/stockService';

const StockListScreen = ({ navigation }) => {
  const [stocks, setStocks] = useState([]);
  const [filteredStocks, setFilteredStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('All'); // All, Available, Expired

  const fetchStocks = async () => {
    try {
      const data = await getMyStocks();
      setStocks(data);
      applyFilters(data, searchQuery, filter);
    } catch (error) {
      console.error('Error fetching stocks:', error);
      // Fallback empty data if server is down for now
      setStocks([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchStocks();
    });
    fetchStocks();
    return unsubscribe;
  }, [navigation]);

  const applyFilters = (data, query, currentFilter) => {
    let result = data;
    
    // Search by name
    if (query) {
      result = result.filter(item => 
        item.vegetableName.toLowerCase().includes(query.toLowerCase())
      );
    }
    
    // Filter by status
    if (currentFilter !== 'All') {
      result = result.filter(item => item.status === currentFilter);
    }
    
    setFilteredStocks(result);
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    applyFilters(stocks, text, filter);
  };

  const clearFilters = () => {
    setFilter('All');
    setSearchQuery('');
    setFilteredStocks(stocks);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchStocks();
  };

  const renderStockItem = ({ item }) => {
    const isAvailable = item.status === 'Available';
    const imageUrl = item.image.startsWith('http') 
        ? item.image 
        : `http://localhost:5000${item.image}`;

    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => navigation.navigate('StockDetail', { stockId: item._id })}
      >
        <Image 
          source={{ uri: imageUrl }} 
          style={styles.cardImage} 
          resizeMode="cover"
        />
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{item.vegetableName}</Text>
          <Text style={styles.cardPrice}>LKR {item.pricePerKg} / kg</Text>
          <Text style={styles.cardSub}>Qty: {item.quantity} kg</Text>
          
          <View style={[
            styles.statusBadge, 
            { backgroundColor: isAvailable ? '#E8F5E9' : '#FFEBEE' }
          ]}>
            <Text style={[
              styles.statusText, 
              { color: isAvailable ? '#2E7D32' : '#C62828' }
            ]}>
              {item.status}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>Loading your harvest...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Stock Management</Text>
        <Text style={styles.headerSubtitle}>Manage your vegetable harvest and sales</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search vegetables..."
          value={searchQuery}
          onChangeText={handleSearch}
        />
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity 
          style={[styles.filterChip, filter === 'All' && styles.filterChipActive]}
          onPress={() => { setFilter('All'); applyFilters(stocks, searchQuery, 'All'); }}
        >
          <Text style={[styles.filterText, filter === 'All' && styles.filterTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterChip, filter === 'Available' && styles.filterChipActive]}
          onPress={() => { setFilter('Available'); applyFilters(stocks, searchQuery, 'Available'); }}
        >
          <Text style={[styles.filterText, filter === 'Available' && styles.filterTextActive]}>Available</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterChip, filter === 'Expired' && styles.filterChipActive]}
          onPress={() => { setFilter('Expired'); applyFilters(stocks, searchQuery, 'Expired'); }}
        >
          <Text style={[styles.filterText, filter === 'Expired' && styles.filterTextActive]}>Expired</Text>
        </TouchableOpacity>
      </View>

      {filteredStocks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No stocks found.</Text>
          {(searchQuery || filter !== 'All') && (
            <TouchableOpacity onPress={clearFilters} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>Clear Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredStocks}
          renderItem={renderStockItem}
          keyExtractor={(item) => item._id}
          refreshing={refreshing}
          onRefresh={onRefresh}
          contentContainerStyle={styles.listContainer}
        />
      )}

      <TouchableOpacity 
        style={styles.fab}
        onPress={() => navigation.navigate('AddStock')}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#607D8B',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },
  searchContainer: {
    padding: 15,
    paddingBottom: 5,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    fontSize: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 10,
    gap: 10,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#EEEEEE',
  },
  filterChipActive: {
    backgroundColor: '#4CAF50',
  },
  filterText: {
    color: '#616161',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    padding: 15,
    paddingBottom: 100,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardImage: {
    width: 100,
    height: '100%',
    backgroundColor: '#EEEEEE',
  },
  cardContent: {
    flex: 1,
    padding: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 4,
  },
  cardPrice: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  fabIcon: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: 'bold',
    lineHeight: 34,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyText: {
    fontSize: 16,
    color: '#9E9E9E',
    marginBottom: 15,
  },
  clearButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#E0E0E0',
    borderRadius: 8,
  },
  clearButtonText: {
    color: '#424242',
    fontWeight: '600',
  }
});

export default StockListScreen;
