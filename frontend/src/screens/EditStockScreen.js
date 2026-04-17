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
import { updateStock } from '../services/stockService';

const EditStockScreen = ({ route, navigation }) => {
  const { stock } = route.params;

  // Format date to YYYY-MM-DD
  const formattedDate = new Date(stock.expiryDate).toISOString().split('T')[0];

  const [vegetableName, setVegetableName] = useState(stock.vegetableName);
  const [quantity, setQuantity] = useState(stock.quantity.toString());
  const [pricePerKg, setPricePerKg] = useState(stock.pricePerKg.toString());
  const [expiryDate, setExpiryDate] = useState(formattedDate);
  const [status, setStatus] = useState(stock.status);
  
  const [newImage, setNewImage] = useState(null); // Local new image if selected
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const originalImageUrl = stock.image.startsWith('http') 
    ? stock.image 
    : `http://localhost:5000${stock.image}`;

  const pickImage = async () => {
    const { status: permStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permStatus !== 'granted') {
      Alert.alert('Permission Denied', 'Camera roll permission is required.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setNewImage(result.assets[0]);
    }
  };

  const validateForm = () => {
    let isValid = true;
    let newErrors = {};

    if (!vegetableName.trim()) {
      newErrors.vegetableName = 'Required';
      isValid = false;
    }
    
    if (!quantity || isNaN(quantity) || Number(quantity) < 0) {
      newErrors.quantity = 'Invalid quantity';
      isValid = false;
    }

    if (!pricePerKg || isNaN(pricePerKg) || Number(pricePerKg) <= 0) {
      newErrors.pricePerKg = 'Invalid price';
      isValid = false;
    }

    if (!expiryDate || !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) {
      newErrors.expiryDate = 'Format: YYYY-MM-DD';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Error', 'Please check the input fields.');
      return;
    }

    // Confirmation if quantity is 0
    if (Number(quantity) === 0) {
      Alert.alert(
        "Remove Stock?", 
        "Setting quantity to 0 will remove this stock entirely from your listings. Continue?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Update", onPress: proceedWithUpdate, style: "destructive" }
        ]
      );
    } else {
      proceedWithUpdate();
    }
  };

  const proceedWithUpdate = async () => {
    try {
      setLoading(true);

      let submitData;

      // If new image is selected, send FormData (Multipart)
      if (newImage) {
        submitData = new FormData();
        submitData.append('vegetableName', vegetableName);
        submitData.append('quantity', quantity);
        submitData.append('pricePerKg', pricePerKg);
        submitData.append('expiryDate', expiryDate);
        submitData.append('status', status);

        const localUri = newImage.uri;
        const filename = localUri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image`;

        submitData.append('image', {
          uri: Platform.OS === 'ios' ? localUri.replace('file://', '') : localUri,
          name: filename,
          type
        });
      } else {
        // Otherwise, send JSON
        submitData = {
          vegetableName,
          quantity: Number(quantity),
          pricePerKg: Number(pricePerKg),
          expiryDate,
          status
        };
      }

      const response = await updateStock(stock._id, submitData);
      
      // Auto-removal fallback UI logic
      if (response.removed || Number(quantity) === 0) {
        Alert.alert('Market Updated', 'Stock was removed due to zero quantity.');
        navigation.navigate('StockList');
      } else {
        Alert.alert('Success', 'Stock updated successfully.');
        navigation.goBack(); // Go back to Detail Screen
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update stock.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.formContainer}>
        
        <View style={styles.imageSection}>
          <Text style={styles.label}>Vegetable Photo</Text>
          <TouchableOpacity style={styles.imagePickerBtn} onPress={pickImage}>
            <Image 
              source={{ uri: newImage ? newImage.uri : originalImageUrl }} 
              style={styles.previewImage} 
            />
            <View style={styles.imageOverlay}>
              <Text style={styles.imageOverlayText}>Change Photo</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Vegetable Name</Text>
          <TextInput
            style={[styles.input, errors.vegetableName && styles.inputError]}
            value={vegetableName}
            onChangeText={(text) => {
              setVegetableName(text);
              if (errors.vegetableName) setErrors({...errors, vegetableName: null});
            }}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
            <Text style={styles.label}>Quantity (kg)</Text>
            <TextInput
              style={[styles.input, errors.quantity && styles.inputError]}
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
            <Text style={styles.label}>Price (LKR/kg)</Text>
            <TextInput
              style={[styles.input, errors.pricePerKg && styles.inputError]}
              keyboardType="numeric"
              value={pricePerKg}
              onChangeText={(text) => {
                setPricePerKg(text);
                if (errors.pricePerKg) setErrors({...errors, pricePerKg: null});
              }}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Expiry Date</Text>
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

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Status</Text>
          <View style={styles.statusChipsContainer}>
            <TouchableOpacity 
              style={[styles.statusChip, status === 'Available' && styles.statusChipActive]}
              onPress={() => setStatus('Available')}
            >
              <Text style={[styles.statusChipText, status === 'Available' && styles.statusChipTextActive]}>Available</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.statusChip, status === 'Out of Stock' && styles.statusChipActiveOOS]}
              onPress={() => setStatus('Out of Stock')}
            >
              <Text style={[styles.statusChipText, status === 'Out of Stock' && styles.statusChipTextActive]}>Out of Stock</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.submitButton, loading && styles.submitButtonDisabled]} 
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    paddingBottom: 40,
  },
  formContainer: {
    padding: 20,
  },
  imageSection: {
    marginBottom: 20,
    alignItems: 'center',
  },
  imagePickerBtn: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F5F5F5',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 10,
    alignItems: 'center',
  },
  imageOverlayText: {
    color: '#FFFFFF',
    fontWeight: '600',
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
  },
  errorText: {
    color: '#F44336',
    fontSize: 12,
    marginTop: 5,
  },
  statusChipsContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  statusChip: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  statusChipActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  statusChipActiveOOS: {
    backgroundColor: '#F44336',
    borderColor: '#F44336',
  },
  statusChipText: {
    color: '#757575',
    fontWeight: '600',
  },
  statusChipTextActive: {
    color: '#FFFFFF',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
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

export default EditStockScreen;
