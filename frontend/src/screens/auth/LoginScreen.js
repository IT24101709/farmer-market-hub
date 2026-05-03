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
  Modal,
  Platform,
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';

const showMessage = (title, message) => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.alert) {
    window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
};

const LoginScreen = ({ navigation }) => {
const [usePhone, setUsePhone] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loadingLocal, setLoadingLocal] = useState(false);
  const [approvalPendingModal, setApprovalPendingModal] = useState(false);
  const [pendingFarmerData, setPendingFarmerData] = useState(null);

  const { login } = useContext(AuthContext);

  const handleLogin = async () => {
    const normalizedIdentifier = usePhone ? identifier.trim() : identifier.trim().toLowerCase();

    if (!normalizedIdentifier || !password) {
      showMessage('Error', 'Please enter identifier and password');
      return;
    }
    if (usePhone) {
      if (!/^\d{10,15}$/.test(normalizedIdentifier)) {
        showMessage('Error', 'Please enter a valid 10-15 digit phone number');
        return;
      }
    } else {
      if (!/^\S+@\S+\.\S+$/.test(normalizedIdentifier)) {
        showMessage('Error', 'Please enter a valid email address');
        return;
      }
    }
    try {
      setLoadingLocal(true);
      await login(normalizedIdentifier, password);
      // Navigation is handled by AppNavigator observing AuthContext state
    } catch (error) {
      // Check if error is due to farmer approval pending
      if (
        error.message.includes('pending admin approval') ||
        error.message.includes('awaiting approval')
      ) {
        setPendingFarmerData({
          identifier: normalizedIdentifier,
          message: error.message,
        });
        setApprovalPendingModal(true);
      } else {
        const msg = error?.message || String(error);
        showMessage('Login Failed', msg);
      }
    } finally {
      setLoadingLocal(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>🌾 Farmers Market Hub</Text>
        <Text style={styles.subtitle}>Fresh from Farm to Table</Text>

        <View style={styles.formContainer}>
          <Text style={styles.heading}>Sign In</Text>

          <View style={styles.formSection}>
            <Text style={styles.label}>Email Address</Text>
            {/* Toggle Button */}
            <TouchableOpacity 
              style={styles.toggleBtn} 
              onPress={() => {
                setUsePhone(!usePhone);
                setIdentifier('');
              }}
            >
              <Text style={styles.toggleBtnText}>
                {usePhone ? '📧 Use Email' : '📱 Use Phone'}
              </Text>
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder={usePhone ? "Enter phone number" : "Enter your email"}
              value={identifier}
              onChangeText={setIdentifier}
              keyboardType={usePhone ? "phone-pad" : "email-address"}
              autoCapitalize="none"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.formSection}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor="#999"
            />
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, loadingLocal && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loadingLocal}
          >
            {loadingLocal ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>New here?</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.registerLink}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.registerLinkText}>
              Create an account to get started
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>❓ Need Help?</Text>
          <Text style={styles.infoText}>
            Farmers: Your account requires admin approval after registration. Check your email for updates.
          </Text>
          <Text style={styles.infoText}>
            Customers: Create your own account with your email, then sign in. Any number of customers can
            use the system; each person uses a separate email and password.
          </Text>
        </View>
      </ScrollView>

      {/* Farmer Approval Pending Modal */}
      <Modal
        visible={approvalPendingModal}
        transparent
        animationType="fade"
        onRequestClose={() => setApprovalPendingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>⏳ Account Approval Pending</Text>

            <View style={styles.modalMessage}>
              <Text style={styles.modalText}>
                Your farmer account is awaiting admin approval. Once approved, you'll be able to login with your credentials.
              </Text>
              <Text style={[styles.modalText, { marginTop: 12 }]}>
                You will receive an email notification once your account has been reviewed and approved.
              </Text>
            </View>

            <View style={styles.tipsBox}>
              <Text style={styles.tipsTitle}>💡 Tips:</Text>
              <Text style={styles.tipItem}>• Check your email for approval updates</Text>
              <Text style={styles.tipItem}>• Approval usually takes 24-48 hours</Text>
              <Text style={styles.tipItem}>• Contact admin if you don't hear back</Text>
            </View>

            <TouchableOpacity
              style={styles.modalBtn}
              onPress={() => {
                setApprovalPendingModal(false);
        setIdentifier('');
                setPassword('');
              }}
            >
              <Text style={styles.modalBtnText}>I Understand</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

  const styles = StyleSheet.create({
    toggleBtn: {
      backgroundColor: '#ecfdf5',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      alignItems: 'center',
      marginBottom: 16,
      borderWidth: 1,
      borderColor: '#15803d',
    },
    toggleBtnText: {
      color: '#166534',
      fontWeight: '600',
      fontSize: 14,
    },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2d5016',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    elevation: 4,
    marginBottom: 20,
  },
  heading: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
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
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    backgroundColor: '#fafafa',
    color: '#333',
  },
  loginBtn: {
    backgroundColor: '#15803d',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 20,
    elevation: 3,
  },
  loginBtnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#999',
    fontSize: 12,
  },
  registerLink: {
    borderWidth: 2,
    borderColor: '#15803d',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  registerLinkText: {
    color: '#15803d',
    fontSize: 14,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#e8f5e9',
    borderLeftWidth: 4,
    borderLeftColor: '#15803d',
    borderRadius: 8,
    padding: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d5016',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#2d5016',
    lineHeight: 18,
    marginBottom: 4,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '85%',
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2d5016',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalMessage: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  modalText: {
    fontSize: 13,
    color: '#856404',
    lineHeight: 18,
  },
  tipsBox: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  tipsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  tipItem: {
    fontSize: 12,
    color: '#555',
    marginBottom: 4,
    lineHeight: 16,
  },
  modalBtn: {
    backgroundColor: '#15803d',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default LoginScreen;
