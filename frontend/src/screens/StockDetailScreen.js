import React, { useState, useEffect } from 'react';
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
import { getStockById, deleteStock } from '../services/stockService';

const StockDetailScreen = ({ route, navigation }) => {
  const { stockId } = route.params;
  const [stock, setStock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchStockDetail = async () => {
      try {
        const data = await getStockById(stockId);
        setStock(data);
      } catch (error) {
        console.error(error);
        Alert.alert('Error', 'Could not load stock details.');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = navigation.addListener('focus', () => {
      fetchStockDetail();
    });

    fetchStockDetail();
    return unsubscribe;
  }, [stockId, navigation]);

  const handleDelete = () => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to remove this stock from the market?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              setDeleting(true);
              await deleteStock(stockId);
              Alert.alert('Success', 'Stock removed successfully.');
              navigation.navigate('StockList');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete stock.');
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
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (!stock) return null;

  const isAvailable = stock.status === 'Available';
  const imageUrl = stock.image.startsWith('http') 
    ? stock.image 
    : `http://localhost:5000${stock.image}`;

  const formattedDate = new Date(stock.expiryDate).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <ScrollView style={styles.container}>
      <Image 
        source={{ uri: imageUrl }} 
        style={styles.heroImage}
        resizeMode="cover"
      />
      
      <View style={styles.contentContainer}>
        <View style={styles.headerInfo}>
          <Text style={styles.title}>{stock.vegetableName}</Text>
          <View style={[
            styles.statusBadge, 
            { backgroundColor: isAvailable ? '#E8F5E9' : '#FFF3E0' }
          ]}>
            <Text style={[
              styles.statusText, 
              { color: isAvailable ? '#2E7D32' : '#E65100' }
            ]}>
              {stock.status}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Price per Kg</Text>
            <Text style={styles.detailValuePrice}>LKR {stock.pricePerKg}</Text>
          </View>
          <View style={styles.divider} />
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Available Quantity</Text>
            <Text style={styles.detailValue}>{stock.quantity} kg</Text>
          </View>
          <View style={styles.divider} />
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Expiry Date</Text>
            <Text style={styles.detailValue}>{formattedDate}</Text>
          </View>
        </View>

        <View style={styles.actionContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.editButton]}
            onPress={() => navigation.navigate('EditStock', { stock })}
          >
            <Text style={styles.editButtonText}>Edit Details</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.deleteButton]}
            onPress={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.deleteButtonText}>Remove Stock</Text>
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
    backgroundColor: '#F5F7FA',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroImage: {
    width: '100%',
    height: 250,
    backgroundColor: '#E0E0E0',
  },
  contentContainer: {
    padding: 20,
    marginTop: -20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: '#F5F7FA',
  },
  headerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#212121',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 10,
  },
  statusText: {
    fontWeight: 'bold',
    fontSize: 14,
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
    shadowRadius: 3,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  detailLabel: {
    fontSize: 16,
    color: '#757575',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },
  detailValuePrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  divider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginVertical: 5,
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  button: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  editButtonText: {
    color: '#2E7D32',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  }
});

export default StockDetailScreen;
