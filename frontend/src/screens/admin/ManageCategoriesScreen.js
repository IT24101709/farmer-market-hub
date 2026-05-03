import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal } from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../../services/categoryService';

const ManageCategoriesScreen = () => {
  const { token } = useContext(AuthContext);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCategories = async () => {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCategories();
  };

  const openModal = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setCatName(category.name);
      setCatDesc(category.description || '');
    } else {
      setEditingCategory(null);
      setCatName('');
      setCatDesc('');
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingCategory(null);
    setCatName('');
    setCatDesc('');
  };

  const handleSave = async () => {
    if (!catName.trim()) {
      Alert.alert('Error', 'Category name is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingCategory) {
        // Update
        const res = await updateCategory(editingCategory._id, { name: catName, description: catDesc }, token);
        setCategories(categories.map(c => c._id === res._id ? res : c));
        Alert.alert('Success', 'Category updated');
      } else {
        // Create
        const res = await createCategory({ name: catName, description: catDesc }, token);
        setCategories([...categories, res].sort((a, b) => a.name.localeCompare(b.name)));
        Alert.alert('Success', 'Category created');
      }
      closeModal();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to save category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id, name) => {
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCategory(id, token);
              setCategories(categories.filter(c => c._id !== id));
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to delete category');
            }
          }
        }
      ]
    );
  };

  const renderCategory = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <Text style={styles.catName}>{item.name}</Text>
        {item.description ? <Text style={styles.catDesc}>{item.description}</Text> : null}
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.editBtn} onPress={() => openModal(item)}>
          <Text style={styles.btnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item._id, item.name)}>
          <Text style={styles.btnTextWhite}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#166534" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={categories}
        renderItem={renderCategory}
        keyExtractor={(item) => item._id}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.centeredEmpty}>
            <Text style={styles.emptyText}>No categories found.</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => openModal()}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingCategory ? 'Edit Category' : 'Add Category'}</Text>
            
            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              value={catName}
              onChangeText={setCatName}
              placeholder="e.g. Root Vegetables"
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={catDesc}
              onChangeText={setCatDesc}
              placeholder="Optional description"
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeModal}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveBtn} 
                onPress={handleSave}
                disabled={isSubmitting}
              >
                {isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  centeredEmpty: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#757575', fontSize: 16 },
  listContainer: { padding: 15, paddingBottom: 80 },
  card: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardInfo: { flex: 1, marginRight: 10 },
  catName: { fontSize: 18, fontWeight: 'bold', color: '#212121' },
  catDesc: { fontSize: 14, color: '#757575', marginTop: 4 },
  cardActions: { flexDirection: 'row', gap: 10 },
  editBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#E0E0E0', borderRadius: 6 },
  deleteBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#F44336', borderRadius: 6 },
  btnText: { color: '#333', fontWeight: 'bold' },
  btnTextWhite: { color: '#FFF', fontWeight: 'bold' },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#166534',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  fabIcon: { fontSize: 32, color: '#FFF', lineHeight: 34 },
  
  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', padding: 20, borderRadius: 15, elevation: 5 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: '#212121' },
  label: { fontSize: 14, fontWeight: '600', color: '#424242', marginBottom: 5 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, padding: 12, marginBottom: 15 },
  textArea: { height: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  cancelBtn: { padding: 12, marginRight: 10 },
  cancelBtnText: { color: '#757575', fontWeight: 'bold', fontSize: 16 },
  saveBtn: { backgroundColor: '#166534', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, minWidth: 80, alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});

export default ManageCategoriesScreen;
