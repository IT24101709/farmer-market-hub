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
  ImageBackground
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
  const [loadingLocal, setLoadingLocal] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [registrationData, setRegistrationData] = useState(null);

  const { register } = useContext(AuthContext);

  const validateForm = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return false;
    }
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      Alert.alert('Error', 'Please enter a valid email');
      return false;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }
    if (role === 'Farmer' && !businessName.trim()) {
      Alert.alert('Error', 'Please enter your business name');
      return false;
    }
    if (role === 'Farmer' && !phone.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    try {
      setLoadingLocal(true);
      const result = await register(name, email, password, role);
      setRegistrationData(result);
      setRegistrationComplete(true);
    } catch (error) {
      Alert.alert('Registration Failed', error.message);
    } finally {
      setLoadingLocal(false);
    }
  };

  if (registrationComplete) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {registrationData?.role === 'Farmer' && !registrationData?.isApproved ? (
            <View style={styles.successCard}>
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingText}>PENDING APPROVAL</Text>
              </View>
              <Text style={styles.successTitle}>Registration Successful!</Text>
              <Text style={styles.successMessage}>
                Hello {registrationData?.name}, your account has been created as a Farmer.
              </Text>
              <View style={styles.infoBox}>
                <Text style={styles.infoTitle}>⏳ Awaiting Admin Approval</Text>
                <Text style={styles.infoText}>
                  Your account is now pending approval from our admin team. You will receive an email notification once your account is approved.
                </Text>
                <Text style={styles.infoText}>
                  You can try logging in once you receive the approval email.
                </Text>
              </View>
              <View style={styles.detailsBox}>
                <Text style={styles.detailsTitle}>Your Registration Details:</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Email:</Text>
                  <Text style={styles.detailValue}>{registrationData?.email}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Role:</Text>
                  <Text style={styles.detailValue}>{registrationData?.role}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => navigation.navigate('Login')}
              >
                <Text style={styles.btnText}>Go to Login</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => {
                  setRegistrationComplete(false);
                  setName('');
                  setEmail('');
                  setPassword('');
                  setConfirmPassword('');
                  setRole('Customer');
                  setBusinessName('');
                  setPhone('');
                }}
              >
                <Text style={styles.secondaryBtnText}>Register Another Account</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.successCard}>
              <View style={styles.approvedBadge}>
                <Text style={styles.approvedText}>✓ APPROVED</Text>
              </View>
              <Text style={styles.successTitle}>Welcome to Farmers Market Hub!</Text>
              <Text style={styles.successMessage}>
                Hello {registrationData?.name}, your account is ready to use.
              </Text>
              <View style={styles.infoBox}>
                <Text style={styles.infoTitle}>🎉 You're All Set</Text>
                <Text style={styles.infoText}>
                  You can now login and start browsing the market or selling your products.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => navigation.navigate('Login')}
              >
                <Text style={styles.btnText}>Go to Login</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => {
                  setRegistrationComplete(false);
                  setName('');
                  setEmail('');
                  setPassword('');
                  setConfirmPassword('');
                  setRole('Customer');
                  setBusinessName('');
                  setPhone('');
                }}
              >
                <Text style={styles.secondaryBtnText}>Register Another Account</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Join Our Community</Text>
        <Text style={styles.subtitle}>Choose your role to get started</Text>

        {/* Role Selection */}
        <View style={styles.roleContainer}>
          <TouchableOpacity
            style={[
              styles.roleCard,
              role === 'Customer' && styles.roleCardActive
            ]}
            onPress={() => setRole('Customer')}
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

              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  ℹ️ As a farmer, your account will need admin approval before you can login for the first time.
                </Text>
              </View>
            </>
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
    marginBottom: 24,
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
    borderColor: '#4CAF50',
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
    color: '#4CAF50',
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
    borderLeftColor: '#4CAF50',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 13,
    color: '#2d5016',
    lineHeight: 18,
  },
  registerBtn: {
    backgroundColor: '#4CAF50',
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
    color: '#4CAF50',
    fontWeight: '600',
  },
  // Success/Completion screen styles
  successCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    elevation: 5,
    marginVertical: 20,
  },
  pendingBadge: {
    alignSelf: 'center',
    backgroundColor: '#fff3cd',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 16,
  },
  pendingText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#856404',
  },
  approvedBadge: {
    alignSelf: 'center',
    backgroundColor: '#d4edda',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 16,
  },
  approvedText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#155724',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2d5016',
    marginBottom: 8,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d5016',
    marginBottom: 8,
  },
  detailsBox: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginVertical: 16,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
  },
  primaryBtn: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 12,
    elevation: 3,
  },
  secondaryBtn: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 8,
  },
  secondaryBtnText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default RegisterScreen;
