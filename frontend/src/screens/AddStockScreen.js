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
import * as ImagePicker from 'expo-image-picker';
import { createStock } from '../services/stockService';

const AddStockScreen = ({ navigation }) => {
  const [vegetableName, setVegetableName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [pricePerKg, setPricePerKg] = useState('');
  const [expiryDate, setExpiryDate] = useState(''); // Simple text fallback for dates, better to use DateTimePicker in production
  const [image, setImage] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

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
      quality: 0.8,
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

    if (!expiryDate || !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) {
      newErrors.expiryDate = 'Please enter date in YYYY-MM-DD format';
      isValid = false;
    } else {
      const expDate = new Date(expiryDate);
      if (expDate < new Date()) {
        newErrors.expiryDate = 'Expiry date cannot be in the past';
        isValid = false;
      }
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
      formData.append('vegetableName', vegetableName);
      formData.append('quantity', quantity);
      formData.append('pricePerKg', pricePerKg);
      formData.append('expiryDate', expiryDate);
      
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

      await createStock(formData);
      
      Alert.alert('Success', 'Stock added successfully to the market!', [
        { text: 'OK', onPress: () => navigation.navigate('StockList') }
      ]);
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert('Error', error.message || 'Failed to add stock. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Add New Harvest</Text>
        <Text style={styles.headerSubtitle}>List your freshly harvested vegetables</Text>
      </View>

      <View style={styles.formContainer}>
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
          <Text style={styles.label}>Estimated Expiry Date *</Text>
          <TextInput
            style={[styles.input, errors.expiryDate && styles.inputError]}
            placeholder="YYYY-MM-DD"
            value={expiryDate}
            onChangeText={(text) => {
              setExpiryDate(text);
              if (errors.expiryDate) setErrors({...errors, expiryDate: null});
            }}
          />
          {errors.expiryDate && <Text style={styles.errorText}>{errors.expiryDate}</Text>}
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

        <TouchableOpacity 
          style={[styles.submitButton, loading && styles.submitButtonDisabled]} 
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Add to Market</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
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
