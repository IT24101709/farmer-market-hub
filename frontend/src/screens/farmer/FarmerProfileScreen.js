import React, { useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';

const NAV_ITEMS = [
  { label: 'Dashboard', screen: 'FarmerDashboard' },
  { label: 'Add Stock', screen: 'AddStock' },
  { label: 'View Stock', screen: 'StockList' },
  { label: 'AI Demand', screen: 'BulkOperations' },
  { label: 'Financial Report', screen: 'PaymentHistory' },
  { label: 'Orders', screen: 'MyOrders' },
  { label: 'Profile', screen: 'FarmerProfile' }
];

const FARM_IMAGE = {
  uri: 'https://images.unsplash.com/photo-1492496913980-501348b61469?auto=format&fit=crop&w=1800&q=80'
};

const displayFarmerId = (user) => (
  user?.farmerId || (user?._id ? `F-${String(user._id).slice(-6).toUpperCase()}` : '-')
);

const FarmerProfileScreen = ({ navigation }) => {
  const { user, updateProfile, logout } = useContext(AuthContext);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    district: '',
    address: '',
    businessName: ''
  });

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.profileDetails?.phone || '',
        district: user.profileDetails?.region || '',
        address: user.profileDetails?.address || '',
        businessName: user.profileDetails?.businessName || ''
      });
    }
  }, [user]);

  const updateField = (field, value) => {
    setForm(current => ({ ...current, [field]: value }));
    if (errors[field]) setErrors(current => ({ ...current, [field]: null }));
  };

  const validateProfile = () => {
    const nextErrors = {};

    if (!form.name.trim()) nextErrors.name = 'Full name is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) nextErrors.email = 'Enter a valid email address.';
    if (form.phone && !/^[0-9+\-\s]{7,15}$/.test(form.phone.trim())) nextErrors.phone = 'Enter a valid phone number.';
    if (form.district && !['North', 'South', 'East', 'West', 'Central'].includes(form.district)) {
      nextErrors.district = 'Use North, South, East, West, or Central.';
    }
    if (form.address.length > 200) nextErrors.address = 'Address must be under 200 characters.';
    if (form.businessName.length > 100) nextErrors.businessName = 'Farm name must be under 100 characters.';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateProfile()) {
      Alert.alert('Validation Error', 'Please fix the highlighted profile fields.');
      return;
    }

    setLoading(true);
    try {
      await updateProfile({
        name: form.name.trim(),
        email: form.email.trim(),
        profileDetails: {
          phone: form.phone.trim(),
          address: form.address.trim(),
          businessName: form.businessName.trim(),
          region: form.district || undefined
        }
      });
      setEditing(false);
      Alert.alert('Success', 'Profile updated successfully.');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleNavigation = (item) => {
    if (item.screen !== 'FarmerProfile') navigation.navigate(item.screen);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground source={FARM_IMAGE} style={styles.background} resizeMode="cover">
        <View style={styles.backdrop}>
          <StockNav activeScreen="FarmerProfile" onNavigate={handleNavigation} />

          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.profilePanel}>
              <View style={styles.headerRow}>
                <View>
                  <Text style={styles.title}>Farmer Profile</Text>
                  <Text style={styles.subtitle}>View your account information and manage your crops.</Text>
                </View>
                <TouchableOpacity style={styles.logoutButton} onPress={logout}>
                  <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.infoGrid}>
                <ProfileField label="Farmer ID" value={displayFarmerId(user)} editable={false} />
                <ProfileField label="Full Name" value={form.name} editable={editing} error={errors.name} onChangeText={(value) => updateField('name', value)} />
                <ProfileField label="Phone" value={form.phone} editable={editing} error={errors.phone} onChangeText={(value) => updateField('phone', value)} keyboardType="phone-pad" />
                <ProfileField label="Email" value={form.email} editable={editing} error={errors.email} onChangeText={(value) => updateField('email', value)} keyboardType="email-address" />
                <ProfileField label="District" value={form.district} editable={editing} error={errors.district} onChangeText={(value) => updateField('district', value)} />
                <ProfileField label="Farm Name" value={form.businessName} editable={editing} error={errors.businessName} onChangeText={(value) => updateField('businessName', value)} />
                <ProfileField label="Address" value={form.address} editable={editing} error={errors.address} onChangeText={(value) => updateField('address', value)} full />
                <ProfileField label="Joined Date" value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB') : '-'} editable={false} />
              </View>

              <View style={styles.actions}>
                {editing ? (
                  <>
                    <TouchableOpacity style={[styles.saveButton, loading && styles.disabled]} onPress={handleSave} disabled={loading}>
                      {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionText}>Save Profile</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.secondaryButton} onPress={() => setEditing(false)} disabled={loading}>
                      <Text style={styles.secondaryText}>Cancel</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity style={styles.secondaryButton} onPress={() => setEditing(true)}>
                      <Text style={styles.secondaryText}>Edit Profile</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.saveButton} onPress={() => navigation.navigate('AddStock')}>
                      <Text style={styles.actionText}>Add New Crop</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </ScrollView>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
};

const ProfileField = ({ label, value, editable, error, onChangeText, keyboardType, full }) => (
  <View style={[styles.profileField, full && styles.fullField]}>
    <Text style={styles.fieldLabel}>{label}</Text>
    {editable ? (
      <TextInput
        style={[styles.fieldInput, error && styles.inputError]}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType || 'default'}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
      />
    ) : (
      <Text style={styles.fieldValue}>{value || '-'}</Text>
    )}
    {error && <Text style={styles.errorText}>{error}</Text>}
  </View>
);

const StockNav = ({ activeScreen, onNavigate }) => (
  <View style={styles.navBar}>
    <View style={styles.brandPill}>
      <Text style={styles.brandIcon}>🌱</Text>
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
  backdrop: { flex: 1, backgroundColor: 'rgba(22, 101, 52, 0.54)' },
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
  brandIcon: { marginRight: 8 },
  brandText: { color: '#13713a', fontSize: 18, fontWeight: '900' },
  navTabs: { alignItems: 'center', gap: 12, paddingHorizontal: 8 },
  navTab: { minWidth: 96, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 6, alignItems: 'center' },
  navTabActive: { backgroundColor: '#fff' },
  navTabText: { color: 'rgba(255,255,255,0.92)', fontWeight: '800' },
  navTabTextActive: { color: '#15803d' },
  content: { paddingHorizontal: 24, paddingTop: 10, paddingBottom: 40, alignItems: 'center' },
  profilePanel: {
    width: '68%',
    minWidth: 320,
    maxWidth: 1060,
    borderRadius: 12,
    backgroundColor: '#fff',
    padding: 30
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20 },
  title: { color: '#111827', fontSize: 42, lineHeight: 48, fontWeight: '900' },
  subtitle: { color: '#6b7280', fontSize: 17, fontWeight: '700' },
  logoutButton: { backgroundColor: '#fff1f2', borderWidth: 1, borderColor: '#ffe4e6', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 12 },
  logoutText: { color: '#991b1b', fontWeight: '900' },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 28 },
  profileField: {
    width: '48.8%',
    minHeight: 84,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 14
  },
  fullField: { width: '100%' },
  fieldLabel: { color: '#6b7280', fontWeight: '700', marginBottom: 12 },
  fieldValue: { color: '#111827', fontSize: 18, fontWeight: '900' },
  fieldInput: { color: '#111827', fontSize: 18, fontWeight: '900', padding: 0 },
  inputError: { borderBottomWidth: 1, borderBottomColor: '#ef4444' },
  errorText: { color: '#dc2626', fontSize: 12, fontWeight: '700', marginTop: 6 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 22 },
  secondaryButton: { backgroundColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 18, paddingVertical: 14 },
  secondaryText: { color: '#1f2937', fontWeight: '900' },
  saveButton: { backgroundColor: '#16a34a', borderRadius: 8, paddingHorizontal: 18, paddingVertical: 14 },
  actionText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  disabled: { opacity: 0.65 }
});

export default FarmerProfileScreen;
