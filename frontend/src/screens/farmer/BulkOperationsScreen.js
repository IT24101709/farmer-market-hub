import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { bulkAddStocks } from '../../services/stockService';
import { getCategories } from '../../services/categoryService';

const BulkOperationsScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  
  // Start with one empty row
  const [rows, setRows] = useState([
    { id: 1, categoryId: null, vegetableName: '', quantity: '', pricePerKg: '', expiryDate: '', image: '' }
  ]);

  React.useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await getCategories();
        setCategories(data);
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    };
    loadCategories();
  }, []);

  const addRow = () => {
    const newId = rows.length > 0 ? rows[rows.length - 1].id + 1 : 1;
    setRows([...rows, { id: newId, categoryId: null, vegetableName: '', quantity: '', pricePerKg: '', expiryDate: '', image: '' }]);
  };

  const removeRow = (id) => {
    if (rows.length === 1) {
      Alert.alert('Cannot Remove', 'You must have at least one row.');
      return;
    }
    setRows(rows.filter(row => row.id !== id));
  };

  const updateRow = (id, field, value) => {
    setRows(rows.map(row => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const handleSubmit = async () => {
    // Validate rows
    const validStocks = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row.vegetableName || !row.quantity || !row.pricePerKg || !row.expiryDate) {
        Alert.alert('Validation Error', `Please fill all required fields in Row ${i + 1}`);
        return;
      }
      validStocks.push({
        categoryId: row.categoryId || undefined,
        vegetableName: row.vegetableName,
        quantity: Number(row.quantity),
        pricePerKg: Number(row.pricePerKg),
        expiryDate: row.expiryDate, // Should be YYYY-MM-DD ideally
        image: row.image || undefined
      });
    }

    setLoading(true);
    try {
      await bulkAddStocks(validStocks);
      Alert.alert('Success', `Successfully added ${validStocks.length} vegetables!`);
      navigation.navigate('StockList');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to bulk add stocks');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.headerInfo}>
          <Text style={styles.infoText}>
            Add multiple vegetables at once. Ensure the Expiry Date format is YYYY-MM-DD.
          </Text>
        </View>

        {rows.map((row, index) => (
          <View key={row.id} style={styles.rowCard}>
            <View style={styles.rowHeader}>
              <Text style={styles.rowTitle}>Item {index + 1}</Text>
              <TouchableOpacity onPress={() => removeRow(row.id)}>
                <Text style={styles.removeIcon}>❌</Text>
              </TouchableOpacity>
            </View>

            {categories.length > 0 && (
              <View style={styles.categoryContainer}>
                <Text style={styles.categoryLabel}>Category (Optional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat._id}
                      style={[
                        styles.categoryChip,
                        row.categoryId === cat._id && styles.categoryChipActive
                      ]}
                      onPress={() => updateRow(row.id, 'categoryId', row.categoryId === cat._id ? null : cat._id)}
                    >
                      <Text style={[
                        styles.categoryText,
                        row.categoryId === cat._id && styles.categoryTextActive
                      ]}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.inputGroup}>
              <TextInput
                style={[styles.input, { flex: 2 }]}
                placeholder="Vegetable Name *"
                value={row.vegetableName}
                onChangeText={(val) => updateRow(row.id, 'vegetableName', val)}
              />
            </View>

            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="Qty (kg) *"
                keyboardType="numeric"
                value={row.quantity}
                onChangeText={(val) => updateRow(row.id, 'quantity', val)}
              />
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="Price/kg *"
                keyboardType="numeric"
                value={row.pricePerKg}
                onChangeText={(val) => updateRow(row.id, 'pricePerKg', val)}
              />
            </View>

            <View style={styles.inputGroup}>
              <TextInput
                style={styles.input}
                placeholder="Expiry Date (YYYY-MM-DD) *"
                value={row.expiryDate}
                onChangeText={(val) => updateRow(row.id, 'expiryDate', val)}
              />
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.addButton} onPress={addRow}>
          <Text style={styles.addButtonText}>+ Add Another Row</Text>
        </TouchableOpacity>

      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.submitButton} 
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitButtonText}>Submit All ({rows.length})</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollContainer: {
    flex: 1,
    padding: 15,
  },
  headerInfo: {
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  infoText: {
    color: '#0D47A1',
    fontSize: 14,
  },
  rowCard: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  rowTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#333',
  },
  removeIcon: {
    fontSize: 18,
  },
  inputGroup: {
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#F9F9F9',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  halfInput: {
    width: '48%',
  },
  addButton: {
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 30,
  },
  addButtonText: {
    color: '#4CAF50',
    fontWeight: 'bold',
    fontSize: 16,
  },
  footer: {
    padding: 15,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 18,
  },
  categoryContainer: {
    marginBottom: 15,
  },
  categoryLabel: {
    fontSize: 13,
    color: '#757575',
    marginBottom: 5,
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#EEEEEE',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#FF9800',
  },
  categoryText: {
    color: '#616161',
    fontSize: 12,
    fontWeight: '600',
  },
  categoryTextActive: {
    color: '#FFFFFF',
  }
});

export default BulkOperationsScreen;
