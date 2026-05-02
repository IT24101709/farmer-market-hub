import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../context/AuthContext';
import { resolveStockImageUrl } from '../config';
import {
  getStockById,
  updateStock
} from '../services/stockService';

/** Browsers must send Blob/File — native uses { uri, name, type }. */
const appendStockImageToFormData = async (formData, image) => {
  const localUri = image.uri;
  const rawName = localUri.split('/').pop()?.split('?')[0] || '';
  const filename =
    localUri.startsWith('blob:') || !rawName ? `stock-${Date.now()}.jpg` : rawName;
  const match = /\.(\w+)$/.exec(filename);

  if (Platform.OS === 'web') {
    const picked = image.file;
    if (picked instanceof Blob) {
      formData.append('image', picked, filename);
      return;
    }
    const res = await fetch(localUri);
    const blob = await res.blob();
    const outName =
      blob.type === 'image/png' ? `stock-${Date.now()}.png` : `stock-${Date.now()}.jpg`;
    formData.append('image', blob, outName);
    return;
  }

  const type = match ? `image/${match[1].toLowerCase()}` : 'image/jpeg';
  formData.append('image', {
    uri: Platform.OS === 'ios' ? localUri.replace('file://', '') : localUri,
    name: filename,
    type
  });
};

const EditStockScreen = ({ route, navigation }) => {
  const stockId = route.params?.stockId || route.params?.stock?._id;
  const { token, logout } = useContext(AuthContext);
  const [stock, setStock] = useState(route.params?.stock || null);
  const [quantity, setQuantity] = useState('');
  const [pricePerKg, setPricePerKg] = useState('');
  const [availabilityStatus, setAvailabilityStatus] = useState(true);
  const [errors, setErrors] = useState({});
  const [newImage, setNewImage] = useState(null);
  const [loading, setLoading] = useState(!route.params?.stock);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadStock = async () => {
      try {
        if (!stockId || !token) return;
        const data = await getStockById(stockId, token);
        setStock(data);
        setQuantity(String(data.quantity ?? ''));
        setPricePerKg(String(data.pricePerKg ?? ''));
        setAvailabilityStatus(data.availabilityStatus === true || data.status === 'Available');
      } catch (error) {
        if (error.status === 401) logout();
        Alert.alert('Error', 'Failed to load stock.');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    if (route.params?.stock) {
      const data = route.params.stock;
      setQuantity(String(data.quantity ?? ''));
      setPricePerKg(String(data.pricePerKg ?? ''));
      setAvailabilityStatus(data.availabilityStatus === true || data.status === 'Available');
    } else {
      loadStock();
    }
  }, [stockId, token]);

  const imageUri = useMemo(
    () => newImage?.uri || (stock ? resolveStockImageUrl(stock) : null),
    [stock, newImage]
  );

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Please allow gallery access to update the stock image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7
    });

    if (!result.canceled && result.assets?.length) {
      setNewImage(result.assets[0]);
    }
  };

  const validateForm = () => {
    const nextErrors = {};
    const qty = Number(quantity);
    const price = Number(pricePerKg);

    if (!Number.isFinite(qty) || qty < 0) nextErrors.quantity = 'Quantity must be a positive number or zero.';
    if (!Number.isFinite(price) || price <= 0) nextErrors.pricePerKg = 'Price must be greater than 0.';
    if (typeof availabilityStatus !== 'boolean') nextErrors.availabilityStatus = 'Select a status.';
    if (newImage?.fileSize && newImage.fileSize > 2 * 1024 * 1024) nextErrors.image = 'Image must be 2 MB or less.';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submitChanges = async () => {
    if (!validateForm()) return;

    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Update this stock quantity, price, and availability status?');
      if (!confirmed) return;
      
      try {
        setSaving(true);
        const qty = Number(quantity);
        const price = Number(pricePerKg);
        const nextStatus = qty > 0 && availabilityStatus ? 'Available' : 'Out of Stock';

        let payload = {
          quantity: qty,
          pricePerKg: price,
          status: nextStatus
        };

        if (newImage) {
          const formData = new FormData();
          formData.append('quantity', String(qty));
          formData.append('pricePerKg', String(price));
          formData.append('status', nextStatus);
          await appendStockImageToFormData(formData, newImage);
          payload = formData;
        }

        const idToUpdate = stockId || stock?._id;
        if (!idToUpdate) {
          window.alert('Error: Missing stock id. Go back and open this listing again.');
          return;
        }
        await updateStock(idToUpdate, payload, token);

        window.alert('Stock updated successfully.');
        navigation.navigate('StockList');
      } catch (error) {
        if (error.status === 401) logout();
        window.alert('Error: ' + (error.message || 'Failed to update stock.'));
      } finally {
        setSaving(false);
      }
      return;
    }

    Alert.alert(
      'Confirm Update',
      'Update this stock quantity, price, and availability status?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async () => {
            try {
              setSaving(true);
              const qty = Number(quantity);
              const price = Number(pricePerKg);
              const nextStatus = qty > 0 && availabilityStatus ? 'Available' : 'Out of Stock';

              let payload = {
                quantity: qty,
                pricePerKg: price,
                status: nextStatus
              };

              if (newImage) {
                const formData = new FormData();
                formData.append('quantity', String(qty));
                formData.append('pricePerKg', String(price));
                formData.append('status', nextStatus);
                await appendStockImageToFormData(formData, newImage);
                payload = formData;
              }

              const idToUpdate = stockId || stock?._id;
              if (!idToUpdate) {
                Alert.alert('Error', 'Missing stock id. Go back and open this listing again.');
                return;
              }
              await updateStock(idToUpdate, payload, token);

              Alert.alert('Success', 'Stock updated successfully.', [
                { text: 'OK', onPress: () => navigation.navigate('StockList') }
              ]);
            } catch (error) {
              if (error.status === 401) logout();
              Alert.alert('Error', error.message || 'Failed to update stock.');
            } finally {
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  if (loading || !stock) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Edit Stock</Text>
        <Text style={styles.subtitle}>{stock.name || stock.vegetableName || 'Stock item'}</Text>

        <TouchableOpacity style={styles.imageWrap} onPress={pickImage}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <Text style={styles.imagePlaceholderText}>Add Image</Text>
            </View>
          )}
          <View style={styles.imageOverlay}>
            <Text style={styles.imageOverlayText}>Change Photo</Text>
          </View>
        </TouchableOpacity>
        {errors.image && <Text style={styles.errorText}>{errors.image}</Text>}

        <View style={styles.formCard}>
          <Text style={styles.label}>Quantity (kg)</Text>
          <TextInput
            style={[styles.input, errors.quantity && styles.inputError]}
            keyboardType="numeric"
            value={quantity}
            onChangeText={(value) => {
              setQuantity(value.replace(/[^0-9.]/g, ''));
              if (errors.quantity) setErrors(current => ({ ...current, quantity: null }));
            }}
          />
          {errors.quantity && <Text style={styles.errorText}>{errors.quantity}</Text>}

          <Text style={styles.label}>Price per kg (LKR)</Text>
          <TextInput
            style={[styles.input, errors.pricePerKg && styles.inputError]}
            keyboardType="numeric"
            value={pricePerKg}
            onChangeText={(value) => {
              setPricePerKg(value.replace(/[^0-9.]/g, ''));
              if (errors.pricePerKg) setErrors(current => ({ ...current, pricePerKg: null }));
            }}
          />
          {errors.pricePerKg && <Text style={styles.errorText}>{errors.pricePerKg}</Text>}

          <Text style={styles.label}>Availability Status</Text>
          <View style={styles.statusRow}>
            <TouchableOpacity
              style={[styles.statusButton, availabilityStatus && styles.statusActive]}
              onPress={() => setAvailabilityStatus(true)}
              disabled={Number(quantity) === 0}
            >
              <Text style={[styles.statusText, availabilityStatus && styles.statusTextActive]}>Available</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.statusButton, !availabilityStatus && styles.statusInactive]}
              onPress={() => setAvailabilityStatus(false)}
            >
              <Text style={[styles.statusText, !availabilityStatus && styles.statusTextInactive]}>Unavailable</Text>
            </TouchableOpacity>
          </View>
          {Number(quantity) === 0 && <Text style={styles.helpText}>Availability will be set to false when quantity is 0.</Text>}

          <TouchableOpacity style={[styles.saveButton, saving && styles.disabled]} onPress={submitChanges} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save Changes</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f8f1'
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f4f8f1'
  },
  content: {
    padding: 18
  },
  title: {
    color: '#111827',
    fontSize: 30,
    fontWeight: '900'
  },
  subtitle: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
    marginBottom: 16
  },
  imageWrap: {
    width: '100%',
    height: 210,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative'
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e5e7eb',
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  imagePlaceholderText: {
    color: '#64748b',
    fontWeight: '900'
  },
  imageOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 10,
    alignItems: 'center'
  },
  imageOverlayText: {
    color: '#fff',
    fontWeight: '900'
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  label: {
    color: '#374151',
    fontWeight: '900',
    marginBottom: 8,
    marginTop: 14
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#111827',
    fontSize: 16
  },
  inputError: {
    borderColor: '#ef4444'
  },
  errorText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6
  },
  statusRow: {
    flexDirection: 'row',
    gap: 10
  },
  statusButton: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingVertical: 12,
    alignItems: 'center'
  },
  statusActive: {
    backgroundColor: '#dcfce7',
    borderColor: '#22c55e'
  },
  statusInactive: {
    backgroundColor: '#fee2e2',
    borderColor: '#ef4444'
  },
  statusText: {
    color: '#374151',
    fontWeight: '900'
  },
  statusTextActive: {
    color: '#166534'
  },
  statusTextInactive: {
    color: '#991b1b'
  },
  helpText: {
    color: '#92400e',
    fontWeight: '700',
    marginTop: 8
  },
  saveButton: {
    backgroundColor: '#16a34a',
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 24
  },
  disabled: {
    opacity: 0.65
  },
  saveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900'
  }
});

export default EditStockScreen;
