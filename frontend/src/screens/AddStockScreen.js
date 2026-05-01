import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { createStock } from '../services/stockService';

import { AuthContext } from '../context/AuthContext';
import { getPriceTrends } from '../services/farmerService';
import { getCategories } from '../services/categoryService';

const AddStockScreen = ({ navigation }) => {
  const { token } = React.useContext(AuthContext);
  const [vegetableName, setVegetableName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [pricePerKg, setPricePerKg] = useState('');
  const [harvestDate, setHarvestDate] = useState('');
  const [status, setStatus] = useState('Available');
  const [image, setImage] = useState(null);
  
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [suggestedPrice, setSuggestedPrice] = useState(null);

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

    // Load draft
    const loadDraft = async () => {
      try {
        const draftStr = await AsyncStorage.getItem('@add_stock_draft');
        if (draftStr) {
          const draft = JSON.parse(draftStr);
          if (draft.vegetableName) setVegetableName(draft.vegetableName);
          if (draft.quantity) setQuantity(draft.quantity);
          if (draft.pricePerKg) setPricePerKg(draft.pricePerKg);
          if (draft.harvestDate) setHarvestDate(draft.harvestDate);
          if (draft.status) setStatus(draft.status);
          if (draft.selectedCategory) setSelectedCategory(draft.selectedCategory);
        }
      } catch (err) {
        // ignore
      }
    };
    loadDraft();
  }, []);

  // Auto-save draft
  React.useEffect(() => {
    const saveDraft = async () => {
      const draft = { vegetableName, quantity, pricePerKg, expiryDate, selectedCategory };
      await AsyncStorage.setItem('@add_stock_draft', JSON.stringify(draft));
    };
    const timer = setTimeout(saveDraft, 1000);
    return () => clearTimeout(timer);
  }, [vegetableName, quantity, pricePerKg, harvestDate, status, selectedCategory]);

  React.useEffect(() => {
    const fetchTrend = async () => {
      if (vegetableName.length > 2) {
        try {
          const res = await getPriceTrends(vegetableName, token);
          if (res && res.suggestedRange) {
            setSuggestedPrice(res.suggestedRange);
          } else {
            setSuggestedPrice(null);
          }
        } catch (error) {
          console.error(error);
        }
      } else {
        setSuggestedPrice(null);
      }
    };
    
    const timeoutId = setTimeout(() => {
      fetchTrend();
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [vegetableName, token]);

  const pickImage = async () => {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to upload an image.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, // Correct usage for expo-image-picker v14+
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5, // Reduced for performance
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImage(result.assets[0]);
    }
  };

  const validateForm = () => {
    let isValid = true;
    let newErrors = {};

    if (!vegetableName.trim()) {
      newErrors.vegetableName = 'Vegetable name is required';
      isValid = false;
    }
    
    if (!quantity || isNaN(quantity) || Number(quantity) <= 0) {
      newErrors.quantity = 'Please enter a valid positive quantity';
      isValid = false;
    }

    if (!pricePerKg || isNaN(pricePerKg) || Number(pricePerKg) <= 0) {
      newErrors.pricePerKg = 'Please enter a valid positive price';
      isValid = false;
    }

    if (!harvestDate || !/^\d{4}-\d{2}-\d{2}$/.test(harvestDate)) {
      newErrors.harvestDate = 'Please enter harvest date in YYYY-MM-DD format';
      isValid = false;
    } else {
      const harvest = new Date(harvestDate);
      const today = new Date();
      today.setHours(0,0,0,0);
      if (harvest > today) {
        newErrors.harvestDate = 'Harvest date cannot be in the future';
        isValid = false;
      }
    }

    if (Number(pricePerKg) < 10 || Number(pricePerKg) > 500) {
      newErrors.pricePerKg = 'Price must be between ₹10 - ₹500 per kg';
      isValid = false;
    }

    if (!image) {
      newErrors.image = 'An image of the harvested vegetable is required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please check the highlighted fields.');
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      if (selectedCategory) {
        formData.append('categoryId', selectedCategory);
      }
      formData.append('vegetableName', vegetableName);
      formData.append('quantity', quantity);
      formData.append('pricePerKg', pricePerKg);
      formData.append('harvestDate', harvestDate);
      formData.append('status', status);
      
      // Append image
      const localUri = image.uri;
      const filename = localUri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image`;

      formData.append('image', {
        uri: Platform.OS === 'ios' ? localUri.replace('file://', '') : localUri,
        name: filename,
        type
      });

      const response = await createStock(formData, token);
      
      // Clear draft
      await AsyncStorage.removeItem('@add_stock_draft');

      Alert.alert('Success', 'Stock added to market!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Submit error:', error);
      const errorMsg = error.message || 'Failed to add stock';
      if (errorMsg.includes('limit') || errorMsg.includes('exceed')) {
        Alert.alert(
          '❌ ERROR: Price exceeds limit',
          `Maximum price for ${vegetableName}: ₹40\nYou entered: ₹${pricePerKg}`,
          [
            { text: 'Go Back to Edit', onPress: () => {} },
            { text: 'Clear Form', onPress: () => {
              setVegetableName('');
              setQuantity('');
              setPricePerKg('');
              setHarvestDate('');
            }}
          ]
        );
      } else {
        Alert.alert('Error', errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
      <Text style={styles.headerTitle}>ADD NEW VEGETABLE</Text>
        <Text style={styles.headerSubtitle}>Fresh produce for the marketplace</Text>
      </View>

      <View style={styles.formContainer}>
        {categories.length > 0 && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Category (Optional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat._id}
                  style={[
                    styles.categoryChip,
                    selectedCategory === cat._id && styles.categoryChipActive
                  ]}
                  onPress={() => setSelectedCategory(
                    selectedCategory === cat._id ? null : cat._id
                  )}
                >
                  <Text style={[
                    styles.categoryText,
                    selectedCategory === cat._id && styles.categoryTextActive
                  ]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Vegetable Name *</Text>
          <TextInput
            style={[styles.input, errors.vegetableName && styles.inputError]}
            placeholder="e.g., Organic Carrots"
            value={vegetableName}
            onChangeText={(text) => {
              setVegetableName(text);
              if (errors.vegetableName) setErrors({...errors, vegetableName: null});
            }}
          />
          {errors.vegetableName && <Text style={styles.errorText}>{errors.vegetableName}</Text>}
          {suggestedPrice && (
            <Text style={styles.suggestionText}>
              Market Price Trend: LKR {suggestedPrice.min} - {suggestedPrice.max} (Avg: {suggestedPrice.average})
            </Text>
          )}
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
            <Text style={styles.label}>Quantity (kg) *</Text>
            <TextInput
              style={[styles.input, errors.quantity && styles.inputError]}
              placeholder="0"
              keyboardType="numeric"
              value={quantity}
              onChangeText={(text) => {
                setQuantity(text);
                if (errors.quantity) setErrors({...errors, quantity: null});
              }}
            />
            {errors.quantity && <Text style={styles.errorText}>{errors.quantity}</Text>}
          </View>

          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Price (LKR/kg) *</Text>
            <TextInput
              style={[styles.input, errors.pricePerKg && styles.inputError]}
              placeholder="0.00"
              keyboardType="numeric"
              value={pricePerKg}
              onChangeText={(text) => {
                setPricePerKg(text);
                if (errors.pricePerKg) setErrors({...errors, pricePerKg: null});
              }}
            />
            {errors.pricePerKg && <Text style={styles.errorText}>{errors.pricePerKg}</Text>}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Harvest Date *</Text>
          <TextInput
            style={[styles.input, errors.harvestDate && styles.inputError]}
            placeholder="YYYY-MM-DD"
            value={harvestDate}
            onChangeText={(text) => {
              setHarvestDate(text);
              if (errors.harvestDate) setErrors({...errors, harvestDate: null});
            }}
          />
          {errors.harvestDate && <Text style={styles.errorText}>{errors.harvestDate}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Availability</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity 
              style={[styles.radioBtn, status === 'Available' && styles.radioBtnSelected]}
              onPress={() => setStatus('Available')}
            >
              <View style={styles.radioIcon}>○</View>
              <Text style={styles.radioLabel}>Available</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.radioBtn, status === 'Coming Soon' && styles.radioBtnSelected]}
              onPress={() => setStatus('Coming Soon')}
            >
              <View style={styles.radioIcon}>○</View>
              <Text style={styles.radioLabel}>Coming Soon</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.imageSection}>
          <Text style={styles.label}>Vegetable Photo *</Text>
          
          <TouchableOpacity 
            style={[styles.imagePickerBtn, errors.image && styles.inputError]} 
            onPress={pickImage}
          >
            {image ? (
              <Image source={{ uri: image.uri }} style={styles.previewImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.imagePlaceholderIcon}>📸</Text>
                <Text style={styles.imagePlaceholderText}>Tap to upload photo</Text>
              </View>
            )}
          </TouchableOpacity>
          {errors.image && <Text style={styles.errorText}>{errors.image}</Text>}
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={styles.cancelBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.submitButton, loading && styles.submitButtonDisabled]} 
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Stock</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

  const styles = StyleSheet.create({
    radioGroup: {
      flexDirection: 'row',
      gap: 20,
      marginTop: 10,
    },
    radioBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: '#E0E0E0',
      backgroundColor: '#F9FAFB',
    },
    radioBtnSelected: {
      borderColor: '#4CAF50',
      backgroundColor: '#E8F5E9',
    },
    radioIcon: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: '#757575',
      backgroundColor: 'transparent',
      marginRight: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    radioLabel: {
      fontSize: 16,
      color: '#333',
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 20,
    },
    cancelBtn: {
      flex: 1,
      paddingVertical: 16,
      paddingHorizontal: 20,
      backgroundColor: '#F5F5F5',
      borderRadius: 8,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#E0E0E0',
    },
    cancelBtnText: {
      color: '#666',
      fontSize: 16,
      fontWeight: '600',
    },
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  contentContainer: {
    paddingBottom: 40,
  },
  header: {
    padding: 20,
    backgroundColor: '#4CAF50',
    paddingTop: 40,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#E8F5E9',
    marginTop: 5,
  },
  formContainer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  inputGroup: {
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#424242',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#212121',
  },
  inputError: {
    borderColor: '#F44336',
    borderWidth: 1.5,
  },
  errorText: {
    color: '#F44336',
    fontSize: 12,
    marginTop: 5,
  },
  suggestionText: {
    color: '#4CAF50',
    fontSize: 12,
    marginTop: 5,
    fontStyle: 'italic',
  },
  categoryScroll: {
    marginTop: 5,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#EEEEEE',
    marginRight: 10,
  },
  categoryChipActive: {
    backgroundColor: '#FF9800',
  },
  categoryText: {
    color: '#616161',
    fontWeight: '600',
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  imageSection: {
    marginBottom: 30,
  },
  imagePickerBtn: {
    height: 150,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderIcon: {
    fontSize: 32,
    marginBottom: 10,
  },
  imagePlaceholderText: {
    color: '#757575',
    fontSize: 14,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  submitButtonDisabled: {
    backgroundColor: '#A5D6A7',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  }
});

export default AddStockScreen;
