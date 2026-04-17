import React, { useState, useContext } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { AuthContext } from '../context/AuthContext';

const RegisterScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Customer'); // Default role
  const [loadingLocal, setLoadingLocal] = useState(false);
  
  const { register } = useContext(AuthContext);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    try {
      setLoadingLocal(true);
      await register(name, email, password, role);
    } catch (error) {
      Alert.alert('Registration Failed', error.message);
    } finally {
      setLoadingLocal(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Join Us</Text>
      
      <View style={styles.formContainer}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter full name"
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Create password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Text style={styles.label}>I am a:</Text>
        <View style={styles.roleContainer}>
          <TouchableOpacity 
            style={[styles.roleBtn, role === 'Customer' && styles.roleBtnActive]} 
            onPress={() => setRole('Customer')}
          >
            <Text style={role === 'Customer' ? styles.roleTextActive : styles.roleText}>Customer</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.roleBtn, role === 'Farmer' && styles.roleBtnActive]} 
            onPress={() => setRole('Farmer')}
          >
            <Text style={role === 'Farmer' ? styles.roleTextActive : styles.roleText}>Farmer</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.registerBtn} 
          onPress={handleRegister}
          disabled={loadingLocal}
        >
          {loadingLocal ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Register</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.linkText}>Already have an account? Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 40 },
  formContainer: { backgroundColor: '#fff', padding: 20, borderRadius: 10, width: '90%', elevation: 5 },
  label: { fontSize: 16, color: '#333', marginBottom: 5 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 20, fontSize: 16 },
  roleContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  roleBtn: { flex: 1, padding: 10, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, alignItems: 'center', marginHorizontal: 5 },
  roleBtnActive: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  roleText: { color: '#333' },
  roleTextActive: { color: '#fff', fontWeight: 'bold' },
  registerBtn: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 20 },
  btnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  linkText: { color: '#4CAF50', textAlign: 'center', fontSize: 16 }
});

export default RegisterScreen;
