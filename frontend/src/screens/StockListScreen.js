import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
  Platform
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { resolveStockImageUrl } from '../config';
import {
  deleteStock,
  getMyStocks,
  toggleStockVisibility,
  updateStockAvailability
} from '../services/stockService';

const SORT_OPTIONS = [
  { key: 'newest', label: 'Newest' },
  { key: 'name', label: 'Name A→Z' },
  { key: 'priceAsc', label: 'Price ↑' },
  { key: 'priceDesc', label: 'Price ↓' },
  { key: 'qtyDesc', label: 'Quantity ↓' }
];

const isAvailable = (stock) => stock.availabilityStatus === true || stock.status === 'Available';

const riskColors = {
  critical: { bg: '#fee2e2', fg: '#991b1b' },
  high: { bg: '#ffedd5', fg: '#c2410c' },
  medium: { bg: '#fef9c3', fg: '#a16207' },
  low: { bg: '#ecfdf5', fg: '#166534' }
};

const StockListScreen = ({ navigation }) => {
  const { token, logout, user } = useContext(AuthContext);
  const { width } = useWindowDimensions();
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const gap = 12;
  const pagePadding = 16;
  const numCols = width >= 520 ? 2 : 1;
  const cardWidth =
    numCols === 1
      ? width - pagePadding * 2
      : (width - pagePadding * 2 - gap) / 2;

  const fetchStocks = useCallback(async () => {
    try {
      if (!token) return;
      const data = await getMyStocks(token, 1, 100);
      setStocks(data.stocks || []);
    } catch (error) {
      console.error('Error fetching stocks:', error);
      if (error.status === 401) logout();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, logout]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', fetchStocks);
    fetchStocks();
    return unsubscribe;
  }, [navigation, fetchStocks]);

  const filteredStocks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return stocks;
    return stocks.filter((stock) => {
      const n = (stock.name || stock.vegetableName || '').toLowerCase();
      return n.includes(query);
    });
  }, [stocks, searchQuery]);

  const sortedStocks = useMemo(() => {
    const list = [...filteredStocks];
    switch (sortBy) {
      case 'name':
        return list.sort((a, b) =>
          String(a.name || a.vegetableName || '').localeCompare(String(b.name || b.vegetableName || ''))
        );
      case 'priceAsc':
        return list.sort((a, b) => Number(a.pricePerKg || 0) - Number(b.pricePerKg || 0));
      case 'priceDesc':
        return list.sort((a, b) => Number(b.pricePerKg || 0) - Number(a.pricePerKg || 0));
      case 'qtyDesc':
        return list.sort((a, b) => Number(b.quantity || 0) - Number(a.quantity || 0));
      case 'newest':
      default:
        return list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }
  }, [filteredStocks, sortBy]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStocks();
  };

  const confirmDelete = useCallback(
    (stock) => {
      const msg = `Remove ${stock.vegetableName || stock.name} from your listings?`;
      if (Platform.OS === 'web') {
        if (window.confirm(msg)) {
          const prevStocks = [...stocks];
          setStocks((current) => current.filter((item) => item._id !== stock._id));
          
          deleteStock(stock._id, token)
            .catch((error) => {
              setStocks(prevStocks);
              if (error.status === 401) logout();
              window.alert(error.message || 'Failed to delete stock.');
            });
        }
        return;
      }

      Alert.alert(
        'Delete stock',
        msg,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              const prevStocks = [...stocks];
              setStocks((current) => current.filter((item) => item._id !== stock._id));
              
              try {
                await deleteStock(stock._id, token);
              } catch (error) {
                setStocks(prevStocks);
                if (error.status === 401) logout();
                Alert.alert('Error', error.message || 'Failed to delete stock.');
              }
            }
          }
        ]
      );
    },
    [token, logout, stocks]
  );

  const handleToggleMarketplace = useCallback(
    async (item) => {
      try {
        await toggleStockVisibility(item._id, token);
        await fetchStocks();
      } catch (error) {
        if (error.status === 401) logout();
        Alert.alert('Marketplace', error.message || 'Could not update listing visibility.');
      }
    },
    [token, logout, fetchStocks]
  );

  const handleToggleAvailability = useCallback(
    async (item) => {
      try {
        const currentlyAvail = isAvailable(item);
        await updateStockAvailability(item._id, !currentlyAvail, token);
        await fetchStocks();
      } catch (error) {
        if (error.status === 401) logout();
        Alert.alert('Availability', error.message || 'Could not update availability.');
      }
    },
    [token, logout, fetchStocks]
  );

  const renderStockCard = useCallback(
    ({ item }) => {
      const available = isAvailable(item);
      const imageUri = resolveStockImageUrl(item);
      const name = item.name || item.vegetableName;
      const riskLevel = String(item.spoilageRiskLevel || 'low').toLowerCase();
      const rc = riskColors[riskLevel] || riskColors.low;
      const daysLeft =
        item.daysLeft !== undefined && item.daysLeft !== null ? item.daysLeft : null;

      return (
        <View style={[styles.gridCard, { width: cardWidth }]}>
          <TouchableOpacity
            style={styles.imageSquareWrap}
            onPress={() => navigation.navigate('StockDetail', { stockId: item._id })}
            activeOpacity={0.85}
          >
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.squareImage} />
            ) : (
              <View style={[styles.squareImage, styles.imagePlaceholder]}>
                <Text style={styles.imagePlaceholderText}>No photo</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.cardDetails}>
            <View style={styles.titleRow}>
              <Text style={styles.stockName} numberOfLines={2}>
                {name}
              </Text>
              <Text style={[styles.statusBadge, available ? styles.availableBadge : styles.unavailableBadge]}>
                {available ? 'Available' : 'Unavailable'}
              </Text>
            </View>

            <Text style={styles.categoryText} numberOfLines={1}>
              {item.category || item.categoryId?.name || 'Vegetable'}
            </Text>

            <View style={[styles.riskPill, { backgroundColor: rc.bg }]}>
              <Text style={[styles.riskPillText, { color: rc.fg }]}>
                Spoilage: {riskLevel.toUpperCase()}
                {daysLeft !== null ? ` · ${daysLeft}d to expiry` : ''}
              </Text>
            </View>

            <View style={styles.metaBlock}>
              <Text style={styles.metaLabel}>Quantity</Text>
              <Text style={styles.metaValue}>
                {Number(item.quantity || 0)} {item.unit || 'kg'}
              </Text>
            </View>
            <View style={styles.metaBlock}>
              <Text style={styles.metaLabel}>Price</Text>
              <Text style={styles.priceValue}>LKR {Number(item.pricePerKg || 0).toFixed(2)} / kg</Text>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => navigation.navigate('EditStock', { stock: item, stockId: item._id })}
              >
                <Text style={styles.editButtonText}>Update</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteButton} onPress={() => confirmDelete(item)}>
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.marketHint}>
              Marketplace: {item.visibility !== false ? 'visible' : 'hidden'} · Approval:{' '}
              {item.approvalStatus || '—'}
            </Text>
            <View style={styles.marketRow}>
              <TouchableOpacity style={styles.marketBtn} onPress={() => handleToggleMarketplace(item)}>
                <Text style={styles.marketBtnText}>
                  {item.visibility !== false ? 'Hide from market' : 'Show on market'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.marketBtnSecondary} onPress={() => handleToggleAvailability(item)}>
                <Text style={styles.marketBtnTextSecondary}>
                  {available ? 'Mark unavailable' : 'Mark available'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => navigation.navigate('StockDetail', { stockId: item._id })}
              style={styles.viewLink}
            >
              <Text style={styles.viewLinkText}>View details</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [navigation, cardWidth, confirmDelete, handleToggleMarketplace, handleToggleAvailability]
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={styles.loadingText}>Loading your stock...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My vegetable stock</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('AddStock')}>
          <Text style={styles.addButtonText}>Add stock</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Search by vegetable name..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholderTextColor="#9ca3af"
      />

      <Text style={styles.sortLabel}>Sort</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.sortScroll}
        contentContainerStyle={styles.sortChipRow}
      >
        {SORT_OPTIONS.map((opt) => {
          const active = sortBy === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[styles.sortChip, active && styles.sortChipActive]}
              onPress={() => setSortBy(opt.key)}
              activeOpacity={0.85}
            >
              <Text style={[styles.sortChipText, active && styles.sortChipTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FlatList
        key={numCols}
        data={sortedStocks}
        keyExtractor={(item) => item._id}
        numColumns={numCols}
        extraData={sortBy}
        renderItem={renderStockCard}
        columnWrapperStyle={numCols > 1 ? styles.columnWrap : undefined}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No stock yet</Text>
            <Text style={styles.emptyText}>Add vegetables or adjust your search.</Text>
          </View>
        }
      />
    </SafeAreaView>
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
    alignItems: 'center',
    backgroundColor: '#f0fdf4'
  },
  loadingText: {
    marginTop: 10,
    color: '#166534',
    fontWeight: '700'
  },
  header: {
    padding: 18,
    backgroundColor: '#15803d',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    flex: 1
  },
  addButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  addButtonText: {
    color: '#15803d',
    fontWeight: '900'
  },
  sortLabel: {
    paddingHorizontal: 16,
    fontSize: 12,
    fontWeight: '800',
    color: '#166534',
    textTransform: 'uppercase',
    marginBottom: 6
  },
  sortScroll: { flexGrow: 0, marginBottom: 8 },
  sortChipRow: { paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
  sortChip: {
    marginRight: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#bbf7d0'
  },
  sortChipActive: { backgroundColor: '#15803d', borderColor: '#15803d' },
  sortChipText: { color: '#166534', fontWeight: '800', fontSize: 13 },
  sortChipTextActive: { color: '#fff' },
  searchInput: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24
  },
  columnWrap: {
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 4
  },
  gridCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4
  },
  imageSquareWrap: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#e5e7eb'
  },
  squareImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover'
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  imagePlaceholderText: {
    color: '#64748b',
    fontWeight: '700'
  },
  cardDetails: {
    padding: 12
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8
  },
  stockName: {
    flex: 1,
    color: '#111827',
    fontSize: 16,
    fontWeight: '900'
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden'
  },
  availableBadge: {
    color: '#166534',
    backgroundColor: '#dcfce7'
  },
  unavailableBadge: {
    color: '#991b1b',
    backgroundColor: '#fee2e2'
  },
  categoryText: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: 13,
    marginTop: 6
  },
  riskPill: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8
  },
  riskPillText: {
    fontSize: 11,
    fontWeight: '800'
  },
  metaBlock: {
    marginTop: 8
  },
  metaLabel: {
    color: '#6b7280',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  metaValue: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2
  },
  priceValue: {
    color: '#15803d',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 2
  },
  marketHint: {
    marginTop: 10,
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600'
  },
  marketRow: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  marketBtn: {
    flex: 1,
    minWidth: 120,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center'
  },
  marketBtnSecondary: {
    flex: 1,
    minWidth: 120,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center'
  },
  marketBtnText: {
    color: '#166534',
    fontWeight: '800',
    fontSize: 12
  },
  marketBtnTextSecondary: {
    color: '#15803d',
    fontWeight: '800',
    fontSize: 12
  },
  actionRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 10
  },
  editButton: {
    flex: 1,
    backgroundColor: '#bbf7d0',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center'
  },
  editButtonText: {
    color: '#15803d',
    fontWeight: '900'
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center'
  },
  deleteButtonText: {
    color: '#991b1b',
    fontWeight: '900'
  },
  viewLink: {
    marginTop: 10,
    alignItems: 'center'
  },
  viewLinkText: {
    color: '#15803d',
    fontWeight: '700',
    fontSize: 13
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 70
  },
  emptyTitle: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '900'
  },
  emptyText: {
    color: '#64748b',
    marginTop: 8,
    fontWeight: '700',
    textAlign: 'center'
  }
});

export default StockListScreen;
