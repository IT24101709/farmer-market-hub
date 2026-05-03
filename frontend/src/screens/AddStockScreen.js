import React, { createElement, useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../context/AuthContext';
import { getCategories } from '../services/categoryService';
import { bulkAddStocks, createStock } from '../services/stockService';
import { resolveStockCategorySlug } from '../utils/stockCategory';

const NAV_ITEMS = [
  { label: 'Dashboard', screen: 'FarmerDashboard' },
  { label: 'Add Stock', screen: 'AddStock' },
  { label: 'View Stock', screen: 'StockList' },
  { label: 'Payment Details', screen: 'PaymentHistory' },
  { label: 'Orders', screen: 'MyOrders' },
  { label: 'Profile', screen: 'FarmerProfile' }
];

const FARM_IMAGE = {
  uri: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=1800&q=80'
};

const formatYmd = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getEmptyForm = () => ({
  vegetableName: '',
  categoryId: '',
  quantity: '',
  pricePerKg: '',
  harvestDate: formatYmd(new Date()),
  status: 'Available'
});

const showToast = (title, message) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.alert === 'function') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

/** Native RN expects { uri, name, type }; browsers need a Blob/File or multer never receives the file. */
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

const parseFormDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const MAX_QTY_KG = 100000;
const MIN_QTY_KG = 0.001;
const QTY_DECIMALS = 3;
const PRICE_DECIMALS = 2;
const MIN_PRICE_LKR = 0.01;

/** Sanitize quantity: positive decimal, max 3 fractional digits, single decimal point */
const sanitizeQuantityInput = (raw) => {
  let t = String(raw || '').replace(/[^0-9.]/g, '');
  const parts = t.split('.');
  if (parts.length > 2) {
    t = parts[0] + '.' + parts.slice(1).join('');
  }
  const [intRaw, fracRaw = ''] = t.split('.');
  const frac = fracRaw.slice(0, QTY_DECIMALS);
  if (t.includes('.')) {
    return `${intRaw}.${frac}`;
  }
  return intRaw;
};

/** Sanitize price: max 2 decimal places (LKR) */
const sanitizePriceInput = (raw) => {
  let t = String(raw || '').replace(/[^0-9.]/g, '');
  const firstDot = t.indexOf('.');
  if (firstDot !== -1) {
    const intPart = t.slice(0, firstDot).replace(/\./g, '');
    const frac = t.slice(firstDot + 1).replace(/\./g, '');
    t = intPart + '.' + frac.slice(0, PRICE_DECIMALS);
  }
  return t;
};



const AddStockScreen = ({ navigation }) => {
  const { token, logout, refreshSession } = useContext(AuthContext);
  const { width } = useWindowDimensions();
  const [form, setForm] = useState(getEmptyForm);
  const [categories, setCategories] = useState([]);
  const [image, setImage] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkRows, setBulkRows] = useState([
    { id: 1, categoryId: null, vegetableName: '', quantity: '', pricePerKg: '', expiryDate: '' }
  ]);
  const [showHarvestPicker, setShowHarvestPicker] = useState(false);

  const isWide = width >= 780;
  const selectedCategory = useMemo(
    () => categories.find(category => category._id === form.categoryId),
    [categories, form.categoryId]
  );

  const harvestDateForPicker = useMemo(() => {
    const p = parseFormDate(form.harvestDate);
    if (p) {
      const x = new Date(p);
      x.setHours(12, 0, 0, 0);
      return x;
    }
    const x = new Date();
    x.setHours(12, 0, 0, 0);
    return x;
  }, [form.harvestDate]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await getCategories();
        setCategories(data || []);
      } catch (error) {
        showToast('Error', 'Unable to load categories.');
      }
    };

    loadCategories();
  }, []);

  const updateField = (field, value) => {
    setForm(current => ({ ...current, [field]: value }));
    if (errors[field]) setErrors(current => ({ ...current, [field]: null }));
  };

  const requestImagePermission = async (source) => {
    const result = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (result.status !== 'granted') {
      showToast('Permission Denied', `Please allow ${source === 'camera' ? 'camera' : 'gallery'} access.`);
      return false;
    }

    return true;
  };

  const pickImage = async (source) => {
    const hasPermission = await requestImagePermission(source);
    if (!hasPermission) return;

    const pickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7
    };

    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync(pickerOptions)
      : await ImagePicker.launchImageLibraryAsync(pickerOptions);

    if (!result.canceled && result.assets?.length) {
      setImage(result.assets[0]);
      setErrors(current => ({ ...current, image: null }));
    }
  };

  const validateForm = () => {
    const nextErrors = {};
    const quantity = Number(form.quantity);
    const price = Number(form.pricePerKg);
    const harvest = parseFormDate(form.harvestDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!form.vegetableName.trim()) nextErrors.vegetableName = 'Vegetable name is required.';
    else if (!/^[a-zA-Z\s-]{2,60}$/.test(form.vegetableName.trim())) {
      nextErrors.vegetableName = 'Use 2-60 letters, spaces, or hyphens.';
    }

    if (!form.categoryId) nextErrors.categoryId = 'Please choose a category from the list.';

    const qtyStr = String(form.quantity || '').trim();
    if (!qtyStr) nextErrors.quantity = 'Quantity is required.';
    else if (!Number.isFinite(quantity)) nextErrors.quantity = 'Enter a valid number (e.g. 12 or 12.5).';
    else if (quantity < MIN_QTY_KG) nextErrors.quantity = `Quantity must be at least ${MIN_QTY_KG} kg.`;
    else if (quantity > MAX_QTY_KG) nextErrors.quantity = `Quantity cannot exceed ${MAX_QTY_KG.toLocaleString()} kg.`;

    const priceStr = String(form.pricePerKg || '').trim();
    if (!priceStr) nextErrors.pricePerKg = 'Price per kg is required.';
    else if (!Number.isFinite(price)) nextErrors.pricePerKg = 'Enter a valid price (e.g. 120 or 120.50).';
    else if (price < MIN_PRICE_LKR) nextErrors.pricePerKg = `Minimum price is LKR ${MIN_PRICE_LKR}.`;
    else if (selectedCategory && (price < selectedCategory.minPrice || price > selectedCategory.maxPrice)) {
      nextErrors.pricePerKg = `For this category, price must be LKR ${selectedCategory.minPrice} – ${selectedCategory.maxPrice} per kg.`;
    }

    if (!harvest) nextErrors.harvestDate = 'Please choose a harvest date using the calendar.';
    else if (harvest > today) nextErrors.harvestDate = 'Harvest date cannot be in the future.';

    if (!['Available', 'Out of Stock'].includes(form.status)) {
      nextErrors.status = 'Select an availability status.';
    }

    if (!image) nextErrors.image = 'Stock image is required.';
    else if (image.fileSize && image.fileSize > 2 * 1024 * 1024) nextErrors.image = 'Image must be 2 MB or less.';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onHarvestDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android' || Platform.OS === 'web') {
      setShowHarvestPicker(false);
    }
    if (event?.type === 'dismissed') {
      return;
    }
    if (selectedDate) {
      updateField('harvestDate', formatYmd(selectedDate));
    }
  };

  const onIosHarvestDateChange = (_, selectedDate) => {
    if (selectedDate) {
      updateField('harvestDate', formatYmd(selectedDate));
    }
  };

  const resetForm = () => {
    setForm(getEmptyForm());
    setImage(null);
    setErrors({});
    setShowHarvestPicker(false);
  };

  const submitStock = async (closeAfterSave, accessTokenOverride = null, didRefresh = false) => {
    if (!validateForm()) {
      showToast('Validation Error', 'Please fix the highlighted fields.');
      return;
    }

    const authToken = accessTokenOverride || token;
    if (!authToken) {
      showToast('Session', 'Please sign in again to add stock.');
      return;
    }

    try {
      setLoading(true);

      const trimmedName = form.vegetableName.trim();
      const categorySlug = resolveStockCategorySlug(selectedCategory);

      const formData = new FormData();
      formData.append('name', trimmedName);
      formData.append('category', categorySlug);
      formData.append('unit', 'kg');
      formData.append('categoryId', form.categoryId);
      formData.append('quantity', form.quantity);
      formData.append('pricePerKg', form.pricePerKg);
      formData.append('harvestDate', form.harvestDate);
      formData.append('status', form.status);

      await appendStockImageToFormData(formData, image);

      await createStock(formData, authToken);
      resetForm();
      showToast('Success', 'Stock added successfully.');

      if (closeAfterSave) navigation.navigate('StockList');
    } catch (error) {
      if (error.status === 401 && !didRefresh) {
        const newToken = await refreshSession();
        if (newToken) {
          return submitStock(closeAfterSave, newToken, true);
        }
      }
      if (error.status === 401) await logout();
      showToast('Error', error.message || error.error || 'Failed to add stock.');
    } finally {
      setLoading(false);
    }
  };

  const addBulkRow = () => {
    const newId = bulkRows.length > 0 ? Math.max(...bulkRows.map((r) => r.id)) + 1 : 1;
    setBulkRows((prev) => [
      ...prev,
      { id: newId, categoryId: null, vegetableName: '', quantity: '', pricePerKg: '', expiryDate: '' }
    ]);
  };

  const removeBulkRow = (id) => {
    if (bulkRows.length === 1) {
      showToast('Bulk add', 'Keep at least one row, or use the single-item form above.');
      return;
    }
    setBulkRows((prev) => prev.filter((row) => row.id !== id));
  };

  const updateBulkRow = (id, field, value) => {
    setBulkRows((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const submitBulk = async (accessTokenOverride = null, didRefresh = false) => {
    const authToken = accessTokenOverride || token;
    if (!authToken) {
      showToast('Session', 'Please sign in again to add stock.');
      return;
    }

    const validStocks = [];
    for (let i = 0; i < bulkRows.length; i++) {
      const row = bulkRows[i];
      if (!row.vegetableName?.trim() || !row.quantity || !row.pricePerKg || !row.expiryDate) {
        showToast('Validation', `Fill name, quantity, price, and expiry in bulk row ${i + 1}.`);
        return;
      }
      const cat = row.categoryId ? categories.find((c) => c._id === row.categoryId) : null;
      validStocks.push({
        categoryId: row.categoryId || undefined,
        category: resolveStockCategorySlug(cat),
        name: row.vegetableName.trim(),
        quantity: Number(row.quantity),
        pricePerKg: Number(row.pricePerKg),
        expiryDate: row.expiryDate
      });
    }

    try {
      setBulkLoading(true);
      await bulkAddStocks(validStocks, authToken);
      showToast('Success', `Added ${validStocks.length} items.`);
      setBulkRows([
        { id: Date.now(), categoryId: null, vegetableName: '', quantity: '', pricePerKg: '', expiryDate: '' }
      ]);
      navigation.navigate('StockList');
    } catch (error) {
      if (error.status === 401 && !didRefresh) {
        const newToken = await refreshSession();
        if (newToken) return submitBulk(newToken, true);
      }
      if (error.status === 401) await logout();
      showToast('Error', error.message || 'Bulk add failed.');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleNavigation = (item) => {
    if (item.screen !== 'AddStock') navigation.navigate(item.screen);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground source={FARM_IMAGE} style={styles.background} resizeMode="cover">
        <View style={styles.backdrop}>
          <StockNav activeScreen="AddStock" onNavigate={handleNavigation} />

          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.formPanel}>
              <Text style={styles.title}>Add New Stock</Text>
              <Text style={styles.subtitle}>List your fresh produce for the marketplace</Text>

              <View style={[styles.formGrid, !isWide && styles.formGridStacked]}>
                <Field label="Vegetable Name *" error={errors.vegetableName} wide={isWide}>
                  <TextInput
                    style={[styles.input, errors.vegetableName && styles.inputError]}
                    placeholder="e.g. Tomato"
                    value={form.vegetableName}
                    onChangeText={(value) => updateField('vegetableName', value)}
                  />
                </Field>

                <Field label="Category *" error={errors.categoryId} wide={isWide}>
                  <Text style={styles.dropdownCaption}>Choose from the list below</Text>
                  <View style={[styles.pickerShell, errors.categoryId && styles.inputError]}>
                    {categories.length === 0 ? (
                      <Text style={styles.pickerEmpty}>Loading categories…</Text>
                    ) : (
                      <Picker
                        selectedValue={form.categoryId}
                        onValueChange={(v) => updateField('categoryId', v)}
                        style={styles.picker}
                        {...(Platform.OS === 'android' ? { dropdownIconColor: '#15803d' } : {})}
                        {...(Platform.OS === 'ios' ? { itemStyle: styles.pickerItemIos } : {})}
                      >
                        <Picker.Item label="— Select a category —" value="" color="#9ca3af" />
                        {categories.map((category) => (
                          <Picker.Item key={category._id} label={category.name} value={category._id} />
                        ))}
                      </Picker>
                    )}
                  </View>
                  {selectedCategory ? (
                    <Text style={styles.fieldHint}>
                      Allowed price for this category: LKR {selectedCategory.minPrice} – {selectedCategory.maxPrice} / kg
                    </Text>
                  ) : null}
                </Field>

                <Field label="Quantity (kg) *" error={errors.quantity} wide={isWide}>
                  <TextInput
                    style={[styles.input, errors.quantity && styles.inputError]}
                    placeholder="e.g. 25 or 12.5"
                    keyboardType="decimal-pad"
                    value={form.quantity}
                    onChangeText={(value) => updateField('quantity', sanitizeQuantityInput(value))}
                  />
                  <Text style={styles.fieldHint}>
                    Min {MIN_QTY_KG} kg · max {MAX_QTY_KG.toLocaleString()} kg · up to {QTY_DECIMALS} decimal places
                  </Text>
                </Field>

                <Field label="Price per kg (LKR) *" error={errors.pricePerKg} wide={isWide}>
                  <TextInput
                    style={[styles.input, errors.pricePerKg && styles.inputError]}
                    placeholder={
                      selectedCategory
                        ? `${selectedCategory.minPrice} – ${selectedCategory.maxPrice}`
                        : 'Enter price'
                    }
                    keyboardType="decimal-pad"
                    value={form.pricePerKg}
                    onChangeText={(value) => updateField('pricePerKg', sanitizePriceInput(value))}
                  />
                  <Text style={styles.fieldHint}>
                    Min LKR {MIN_PRICE_LKR} · max 2 decimal places
                    {selectedCategory ? ` · must fall within your category range above` : ''}
                  </Text>
                </Field>

                <Field label="Harvest Date *" error={errors.harvestDate} wide={isWide}>
                  <TouchableOpacity
                    style={[styles.dateTrigger, errors.harvestDate && styles.inputError]}
                    onPress={() => setShowHarvestPicker(true)}
                    disabled={loading}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[styles.dateTriggerText, !form.harvestDate && styles.dateTriggerPlaceholder]}
                      numberOfLines={1}
                    >
                      {form.harvestDate
                        ? new Date(`${form.harvestDate}T12:00:00`).toLocaleDateString('en-GB', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })
                        : 'Tap to choose harvest date (calendar)'}
                    </Text>
                    <Text style={styles.dateTriggerIcon} accessibilityLabel="Open calendar">
                      📅
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.fieldHint}>Cannot be in the future</Text>

                  {(Platform.OS === 'ios' || Platform.OS === 'web') ? (
                    <Modal
                      visible={showHarvestPicker}
                      transparent
                      animationType="fade"
                      onRequestClose={() => setShowHarvestPicker(false)}
                    >
                      <View style={styles.dateModalOverlay}>
                        <TouchableOpacity
                          style={styles.dateModalBackdrop}
                          activeOpacity={1}
                          onPress={() => setShowHarvestPicker(false)}
                        />
                        <View style={[styles.dateModalCard, Platform.OS === 'ios' && styles.dateModalCardTall]}>
                          <Text style={styles.dateModalTitle}>Choose harvest date</Text>
                          {Platform.OS === 'web' ? (
                            <View style={styles.webDateInputWrap}>
                              {createElement('input', {
                                type: 'date',
                                max: formatYmd(new Date()),
                                value: form.harvestDate || '',
                                onChange: (e) => {
                                  const v = e?.target?.value;
                                  if (v) updateField('harvestDate', v);
                                },
                                style: styles.webDateInput
                              })}
                            </View>
                          ) : (
                            <DateTimePicker
                              value={harvestDateForPicker}
                              mode="date"
                              display="inline"
                              themeVariant="light"
                              maximumDate={new Date()}
                              onChange={onIosHarvestDateChange}
                            />
                          )}
                          <TouchableOpacity
                            style={styles.dateModalDone}
                            onPress={() => setShowHarvestPicker(false)}
                          >
                            <Text style={styles.dateModalDoneText}>Done</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </Modal>
                  ) : null}

                  {Platform.OS === 'android' && showHarvestPicker ? (
                    <DateTimePicker
                      value={harvestDateForPicker}
                      mode="date"
                      display="calendar"
                      maximumDate={new Date()}
                      onChange={onHarvestDateChange}
                    />
                  ) : null}
                </Field>

                <Field label="Availability Status *" error={errors.status} wide={isWide}>
                  <View style={styles.statusRow}>
                    {['Available', 'Out of Stock'].map(status => (
                      <TouchableOpacity
                        key={status}
                        style={[styles.statusButton, form.status === status && styles.statusButtonActive]}
                        onPress={() => updateField('status', status)}
                      >
                        <Text style={[styles.statusText, form.status === status && styles.statusTextActive]}>{status}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </Field>
              </View>

              <View style={styles.sectionBlock}>
                <Text style={styles.label}>Stock Image *</Text>
                <View style={styles.imageActions}>
                  <TouchableOpacity style={styles.imageActionButton} onPress={() => pickImage('gallery')} disabled={loading}>
                    <Text style={styles.imageActionText}>Choose from Gallery</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.imageActionButton} onPress={() => pickImage('camera')} disabled={loading}>
                    <Text style={styles.imageActionText}>Open Camera</Text>
                  </TouchableOpacity>
                </View>
                <View style={[styles.imagePicker, errors.image && styles.inputError]}>
                  {image ? (
                    <Image source={{ uri: image.uri }} style={styles.previewImage} />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Text style={styles.imageText}>No image selected</Text>
                    </View>
                  )}
                </View>
                {errors.image && <Text style={styles.errorText}>{errors.image}</Text>}
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.saveButton, (loading || bulkLoading) && styles.disabled]}
                  onPress={() => submitStock(false)}
                  disabled={loading || bulkLoading}
                >
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>SAVE & ADD ANOTHER</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.closeButton, (loading || bulkLoading) && styles.disabled]}
                  onPress={() => submitStock(true)}
                  disabled={loading || bulkLoading}
                >
                  <Text style={styles.buttonText}>SAVE & CLOSE</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()} disabled={loading || bulkLoading}>
                  <Text style={styles.buttonText}>CANCEL</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.bulkSection}>
                <Text style={styles.bulkSectionTitle}>Add multiple at once (bulk)</Text>
                <Text style={styles.bulkHint}>
                  One row per vegetable. Expiry must be YYYY-MM-DD. Category is optional. Uses the same API as quick bulk entry — no photo per row (default image applies).
                </Text>

                {bulkRows.map((row, index) => (
                  <View key={row.id} style={styles.bulkRowCard}>
                    <View style={styles.bulkRowHeader}>
                      <Text style={styles.bulkRowTitle}>Bulk item {index + 1}</Text>
                      <TouchableOpacity onPress={() => removeBulkRow(row.id)} disabled={bulkLoading}>
                        <Text style={styles.bulkRemoveIcon}>✕</Text>
                      </TouchableOpacity>
                    </View>

                    {categories.length > 0 ? (
                      <View style={styles.bulkCategoryBlock}>
                        <Text style={styles.bulkCategoryLabel}>Category (optional)</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bulkCategoryScroll}>
                          {categories.map((cat) => (
                            <TouchableOpacity
                              key={cat._id}
                              style={[
                                styles.bulkChip,
                                row.categoryId === cat._id && styles.bulkChipActive
                              ]}
                              onPress={() =>
                                updateBulkRow(row.id, 'categoryId', row.categoryId === cat._id ? null : cat._id)
                              }
                              disabled={bulkLoading}
                            >
                              <Text
                                style={[
                                  styles.bulkChipText,
                                  row.categoryId === cat._id && styles.bulkChipTextActive
                                ]}
                              >
                                {cat.name}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    ) : null}

                    <TextInput
                      style={[styles.input, styles.bulkField]}
                      placeholder="Vegetable name *"
                      value={row.vegetableName}
                      onChangeText={(val) => updateBulkRow(row.id, 'vegetableName', val)}
                      editable={!bulkLoading}
                    />
                    <View style={styles.bulkInputRow}>
                      <TextInput
                        style={[styles.input, styles.bulkHalf]}
                        placeholder="Qty (kg) *"
                        keyboardType="decimal-pad"
                        value={row.quantity}
                        onChangeText={(val) => updateBulkRow(row.id, 'quantity', sanitizeQuantityInput(val))}
                        editable={!bulkLoading}
                      />
                      <TextInput
                        style={[styles.input, styles.bulkHalf]}
                        placeholder="Price/kg *"
                        keyboardType="decimal-pad"
                        value={row.pricePerKg}
                        onChangeText={(val) => updateBulkRow(row.id, 'pricePerKg', sanitizePriceInput(val))}
                        editable={!bulkLoading}
                      />
                    </View>
                    <TextInput
                      style={[styles.input, styles.bulkField]}
                      placeholder="Expiry date YYYY-MM-DD *"
                      value={row.expiryDate}
                      onChangeText={(val) => updateBulkRow(row.id, 'expiryDate', val)}
                      editable={!bulkLoading}
                    />
                  </View>
                ))}

                <TouchableOpacity
                  style={styles.bulkAddRowBtn}
                  onPress={addBulkRow}
                  disabled={bulkLoading}
                >
                  <Text style={styles.bulkAddRowText}>+ Add bulk row</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.bulkSubmitBtn, bulkLoading && styles.disabled]}
                  onPress={() => submitBulk()}
                  disabled={bulkLoading || loading}
                >
                  {bulkLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>SUBMIT BULK ({bulkRows.length})</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
};

const Field = ({ label, error, children, wide }) => (
  <View style={[styles.field, wide && styles.fieldWide]}>
    <Text style={styles.label}>{label}</Text>
    {children}
    {error && <Text style={styles.errorText}>{error}</Text>}
  </View>
);

const StockNav = ({ activeScreen, onNavigate }) => (
  <View style={styles.navBar}>
    <View style={styles.brandPill}>
      <Text style={styles.brandIcon}>Stock</Text>
      <Text style={styles.brandText}>Stock Manager</Text>
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.navTabs}>
      {NAV_ITEMS.map(item => (
        <TouchableOpacity
          key={item.label}
          style={[styles.navTab, item.screen === activeScreen && styles.navTabActive]}
          onPress={() => onNavigate(item)}
        >
          <Text style={[styles.navTabText, item.screen === activeScreen && styles.navTabTextActive]}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#103d2b' },
  background: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(6, 25, 16, 0.45)' },
  navBar: {
    minHeight: 76,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(129, 211, 166, 0.92)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14
  },
  brandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.58)'
  },
  brandIcon: { color: '#15803d', fontSize: 11, fontWeight: '900', marginRight: 8 },
  brandText: { color: '#13713a', fontSize: 18, fontWeight: '900' },
  navTabs: { alignItems: 'center', gap: 12, paddingHorizontal: 8 },
  navTab: { minWidth: 96, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 6, alignItems: 'center' },
  navTabActive: { backgroundColor: '#fff' },
  navTabText: { color: 'rgba(255,255,255,0.92)', fontWeight: '800' },
  navTabTextActive: { color: '#15803d' },
  content: { paddingTop: 40, paddingBottom: 50, alignItems: 'center' },
  formPanel: {
    width: '72%',
    minWidth: 320,
    maxWidth: 980,
    borderTopWidth: 4,
    borderTopColor: '#84cc16',
    borderRadius: 10,
    backgroundColor: 'rgba(236, 241, 235, 0.86)',
    paddingHorizontal: 34,
    paddingVertical: 40
  },
  title: { color: '#22c55e', fontSize: 25, fontWeight: '900', textAlign: 'center' },
  subtitle: { color: '#4b5563', fontSize: 17, fontWeight: '700', textAlign: 'center', marginTop: 8, marginBottom: 28 },
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 18 },
  formGridStacked: { flexDirection: 'column' },
  field: { width: '100%', marginBottom: 20 },
  fieldWide: { width: '48%' },
  label: { color: '#374151', fontWeight: '900', marginBottom: 10 },
  input: {
    minHeight: 42,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#111827',
    fontSize: 14
  },
  inputError: { borderColor: '#ef4444', borderWidth: 1.5 },
  errorText: { color: '#dc2626', fontSize: 12, fontWeight: '700', marginTop: 6 },
  pickerShell: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
    minHeight: 48,
    justifyContent: 'center'
  },
  picker: {
    width: '100%',
    ...(Platform.OS === 'android' ? { color: '#111827' } : {}),
    ...(Platform.OS === 'web'
      ? {
          minHeight: 44,
          outlineStyle: 'none'
        }
      : {})
  },
  pickerItemIos: { height: 140 },
  pickerEmpty: { paddingHorizontal: 14, paddingVertical: 12, color: '#64748b', fontWeight: '700' },
  dropdownCaption: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8
  },
  fieldHint: { marginTop: 8, fontSize: 12, color: '#64748b', fontWeight: '600', lineHeight: 16 },
  webDateInputWrap: {
    width: '100%',
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'stretch'
  },
  webDateInput: {
    width: '100%',
    fontSize: 16,
    padding: 12,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#e5e7eb',
    borderRadius: 8,
    boxSizing: 'border-box'
  },
  dateTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 46,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  dateTriggerText: { flex: 1, fontSize: 15, fontWeight: '700', color: '#111827' },
  dateTriggerPlaceholder: { color: '#9ca3af', fontWeight: '600' },
  dateTriggerIcon: { fontSize: 20, marginLeft: 8 },
  dateModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)'
  },
  dateModalBackdrop: { ...StyleSheet.absoluteFillObject },
  dateModalCard: {
    width: '88%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingTop: 16,
    paddingBottom: 8,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8
  },
  dateModalTitle: {
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 4
  },
  dateModalDone: {
    marginTop: 4,
    marginHorizontal: 12,
    marginBottom: 12,
    backgroundColor: '#15803d',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center'
  },
  dateModalDoneText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  statusRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  statusButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
  statusButtonActive: { backgroundColor: '#dcfce7', borderColor: '#22c55e' },
  statusText: { color: '#374151', fontWeight: '800' },
  statusTextActive: { color: '#15803d' },
  sectionBlock: { marginBottom: 24 },
  imageActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 },
  imageActionButton: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
  imageActionText: { color: '#15803d', fontWeight: '900' },
  imagePicker: { height: 170, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#d1d5db', overflow: 'hidden' },
  previewImage: { width: '100%', height: '100%' },
  imagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  imageText: { color: '#64748b', fontWeight: '700' },
  buttonRow: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 16 },
  saveButton: { backgroundColor: '#2f7d1f', borderRadius: 8, paddingHorizontal: 22, paddingVertical: 14 },
  closeButton: { backgroundColor: '#16a34a', borderRadius: 8, paddingHorizontal: 22, paddingVertical: 14 },
  cancelButton: { marginLeft: 'auto', backgroundColor: '#e11d48', borderRadius: 8, paddingHorizontal: 22, paddingVertical: 14 },
  disabled: { opacity: 0.65 },
  buttonText: { color: '#fff', fontWeight: '900' },
  bulkSection: {
    marginTop: 36,
    paddingTop: 28,
    borderTopWidth: 2,
    borderTopColor: 'rgba(21, 128, 61, 0.25)'
  },
  bulkSectionTitle: {
    color: '#15803d',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 8,
    textAlign: 'center'
  },
  bulkHint: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
    marginBottom: 20,
    textAlign: 'center'
  },
  bulkRowCard: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    marginBottom: 14
  },
  bulkRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  bulkRowTitle: { color: '#374151', fontWeight: '900', fontSize: 15 },
  bulkRemoveIcon: { color: '#dc2626', fontSize: 18, fontWeight: '900', paddingHorizontal: 8 },
  bulkCategoryBlock: { marginBottom: 12 },
  bulkCategoryLabel: { fontSize: 12, color: '#64748b', fontWeight: '700', marginBottom: 6 },
  bulkCategoryScroll: { flexGrow: 0 },
  bulkChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    marginRight: 8
  },
  bulkChipActive: { backgroundColor: '#15803d' },
  bulkChipText: { color: '#475569', fontSize: 12, fontWeight: '700' },
  bulkChipTextActive: { color: '#fff' },
  bulkField: { marginBottom: 10 },
  bulkInputRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 10 },
  bulkHalf: { flex: 1, minWidth: 120 },
  bulkAddRowBtn: {
    borderWidth: 1,
    borderColor: '#15803d',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 14
  },
  bulkAddRowText: { color: '#15803d', fontWeight: '900', fontSize: 15 },
  bulkSubmitBtn: {
    backgroundColor: '#0f766e',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center'
  }
});

export default AddStockScreen;
