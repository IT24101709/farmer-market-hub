import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  ImageBackground,
  Modal
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';

const RegisterScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('Customer');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [district, setDistrict] = useState('');
  const [loadingLocal, setLoadingLocal] = useState(false);
  const [localError, setLocalError] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [registrationData, setRegistrationData] = useState(null);

  const { register } = useContext(AuthContext);

  const validateForm = () => {
    setLocalError('');
    if (!name.trim() || !email.trim() || !password) {
      setLocalError('❌ Please fill in all required fields (*).');
      return false;
    }

    if (!/^[a-zA-Z\s]{3,50}$/.test(name.trim())) {
      setLocalError('❌ Full Name must be 3-50 characters with no special symbols.');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setLocalError('❌ Please enter a valid email address.');
      return false;
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      setLocalError('❌ Password must contain 8+ chars, uppercase, number & symbol.');
      return false;
    }

    if (password !== confirmPassword) {
      setLocalError('❌ Passwords do not match.');
      return false;
    }

    if (role === 'Farmer') {
      if (!businessName.trim() || businessName.length > 100) {
        setLocalError('❌ Farm Name is required and must be under 100 characters.');
        return false;
      }
      if (!phone.trim() || !/^\d{10,15}$/.test(phone.trim())) {
        setLocalError('❌ Enter a valid 10-digit mobile number.');
        return false;
      }
      
      const safeDistrict = district || '';
      const formattedDistrict = safeDistrict.trim() 
        ? safeDistrict.trim().charAt(0).toUpperCase() + safeDistrict.trim().slice(1).toLowerCase() 
        : '';
        
      if (formattedDistrict && !['North', 'South', 'East', 'West', 'Central'].includes(formattedDistrict)) {
        setLocalError('❌ District must be North, South, East, West, or Central.');
        return false;
      }
    }

    if (role === 'Customer') {
      if (address.trim() && address.length > 200) {
        setLocalError('❌ Address must be under 200 characters.');
        return false;
      }
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    try {
      setLoadingLocal(true);
      setLocalError('');
      console.log('🔄 Starting registration with role:', role);
      
      const safeDistrict = district || '';
      const formattedDistrict = safeDistrict.trim() 
        ? safeDistrict.trim().charAt(0).toUpperCase() + safeDistrict.trim().slice(1).toLowerCase() 
        : undefined;

      const result = await register(name, email, password, role, { 
        businessName, 
        phone: (phone || '').trim(), 
        address: (address || '').trim(),
        region: formattedDistrict
      });
      console.log('✅ Registration result:', result);

      // Customers receive a token immediately: session is stored and the app switches to the customer home.
      // Avoid follow-up UI on the auth screen (it unmounts) and prevent setState-after-unmount noise.
      if (role === 'Customer' && (result?.accessToken || result?.token)) {
        return;
      }

      setRegistrationData(result);

      if (role === 'Farmer' && !result.isApproved) {
        console.log('🚜 Farmer account pending approval');
        setShowPopup(true);
      } else {
        console.log('✅ User account created and ready');
        Alert.alert('✅ Registration Successful!', `Welcome ${name}! Your account is ready.`, [
          { text: 'Login Now', onPress: () => navigation.navigate('Login') }
        ]);
      }
    } catch (error) {
      console.error('❌ Registration error:', error);
      console.error('❌ Error message:', error.message);
      setLocalError(error.message || 'An error occurred during registration. Please try again.');
    } finally {
      setLoadingLocal(false);
    }
  };



  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Join Our Community</Text>
        <Text style={styles.subtitle}>Choose your role to get started</Text>
        <Text style={styles.informationalText}>
          Every customer (and farmer) has their own account. Use a unique email for each person; many
          customers can register and sign in on their own devices with their own credentials.
        </Text>

        {/* Role Selection */}
        <View style={styles.roleContainer}>
          <TouchableOpacity
            style={[
              styles.roleCard,
              role === 'Customer' && styles.roleCardActive
            ]}
            onPress={() => {
              setRole('Customer');
              setPhone('');
              setBusinessName('');
              setDistrict('');
            }}
          >
            <Text style={styles.roleEmoji}>🛒</Text>
            <Text
              style={[
                styles.roleTitle,
                role === 'Customer' && styles.roleTitleActive
              ]}
            >
              Customer
            </Text>
            <Text style={styles.roleDescription}>
              Browse & buy fresh produce
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.roleCard,
              role === 'Farmer' && styles.roleCardActive
            ]}
            onPress={() => setRole('Farmer')}
          >
            <Text style={styles.roleEmoji}>🚜</Text>
            <Text
              style={[
                styles.roleTitle,
                role === 'Farmer' && styles.roleTitleActive
              ]}
            >
              Farmer
            </Text>
            <Text style={styles.roleDescription}>
              Sell your fresh products
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          <View style={styles.formSection}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              value={name}
              onChangeText={setName}
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.formSection}>
            <Text style={styles.label}>Email Address *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#999"
            />
          </View>

          {role === 'Farmer' && (
            <>
              <View style={styles.formSection}>
                <Text style={styles.label}>Business Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your farm/business name"
                  value={businessName}
                  onChangeText={setBusinessName}
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.formSection}>
                <Text style={styles.label}>Phone Number *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your phone number"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.formSection}>
                <Text style={styles.label}>District (Region)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., North, South, Central"
                  value={district}
                  onChangeText={setDistrict}
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.formSection}>
                <Text style={styles.label}>Address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your address"
                  value={address}
                  onChangeText={setAddress}
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  ℹ️ As a farmer, your account will need admin approval before you can login for the first time.
                </Text>
              </View>
            </>
          )}

          {role === 'Customer' && (
            <View style={styles.formSection}>
              <Text style={styles.label}>Address (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your address"
                value={address}
                onChangeText={setAddress}
                placeholderTextColor="#999"
              />
            </View>
          )}

          <View style={styles.formSection}>
            <Text style={styles.label}>Password *</Text>
            <TextInput
              style={styles.input}
              placeholder="Create a password (min 6 chars)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.formSection}>
            <Text style={styles.label}>Confirm Password *</Text>
            <TextInput
              style={styles.input}
              placeholder="Confirm your password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholderTextColor="#999"
            />
          </View>

          {localError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{localError}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.registerBtn, loadingLocal && styles.registerBtnDisabled]}
            onPress={handleRegister}
            disabled={loadingLocal}
          >
            {loadingLocal ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Register</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.linkText}>
              Already have an account? <Text style={styles.linkHighlight}>Login</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Pop-up message for Farmer Registration */}
      <Modal visible={showPopup} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <Text style={styles.modalIcon}>✅</Text>
            </View>
            <Text style={styles.modalTitle}>Registration Successful!</Text>
            <Text style={styles.modalMessage}>
              Hello {name}, your farmer account has been created.
            </Text>
            <View style={styles.modalInfoBox}>
              <Text style={styles.modalInfoText}>
                Please wait until the admin approves your account before you can log in to the system.
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.modalButton} 
              onPress={() => {
                setShowPopup(false);
                navigation.navigate('Login');
              }}
            >
              <Text style={styles.modalButtonText}>Go to Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2d5016',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  informationalText: {
    fontSize: 13,
    color: '#4b5563',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
    paddingHorizontal: 4
  },
  roleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  roleCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    elevation: 2,
  },
  roleCardActive: {
    borderColor: '#15803d',
    backgroundColor: '#f1f8f4',
  },
  roleEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  roleTitleActive: {
    color: '#15803d',
  },
  roleDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 3,
    marginBottom: 20,
  },
  formSection: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#fafafa',
    color: '#333',
  },
  infoBox: {
    backgroundColor: '#e8f5e9',
    borderLeftWidth: 4,
    borderLeftColor: '#15803d',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 13,
    color: '#2d5016',
    lineHeight: 18,
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: '#991b1b',
    lineHeight: 18,
    fontWeight: '600'
  },
  registerBtn: {
    backgroundColor: '#15803d',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
    elevation: 3,
  },
  registerBtnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkText: {
    color: '#666',
    textAlign: 'center',
    fontSize: 14,
    marginTop: 16,
  },
  linkHighlight: {
    color: '#15803d',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  modalIcon: {
    fontSize: 32
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#166534',
    marginBottom: 12,
    textAlign: 'center'
  },
  modalMessage: {
    fontSize: 15,
    color: '#4b5563',
    textAlign: 'center',
    marginBottom: 16
  },
  modalInfoBox: {
    backgroundColor: '#fef3c7',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    marginBottom: 24,
    width: '100%'
  },
  modalInfoText: {
    color: '#92400e',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    textAlign: 'center'
  },
  modalButton: {
    backgroundColor: '#15803d',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center'
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700'
  }
});

export default RegisterScreen;
