// src/screens/LoginScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../firebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Missing Info", "Please enter both Email and Password.");
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      Alert.alert("Login Failed", "Incorrect email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.headerContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="leaf" size={48} color="#2D6A4F" />
          </View>
          <Text style={styles.appTitle}>APPP NAME</Text>
          <Text style={styles.tagline}>Track & Share Your Daily Actions</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardHeader}>Welcome Back</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="Email Address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#999" />
          </View>
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry placeholderTextColor="#999" />
          </View>
          <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginButtonText}>Log In</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Need an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
            <Text style={styles.signupText}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#2D6A4F' },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  headerContainer: { alignItems: 'center', marginBottom: 30 },
  iconCircle: { backgroundColor: '#fff', width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center', marginBottom: 15, elevation: 5 },
  appTitle: { fontSize: 30, fontWeight: 'bold', color: '#fff', letterSpacing: 1 },
  tagline: { fontSize: 15, color: 'rgba(255,255,255,0.85)', marginTop: 5 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 25, elevation: 6 },
  cardHeader: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 20, textAlign: 'center' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#eee', backgroundColor: '#f9f9f9', borderRadius: 12, paddingHorizontal: 15, marginBottom: 15, height: 50 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, height: '100%', color: '#333', fontSize: 16 },
  loginButton: { backgroundColor: '#2D6A4F', borderRadius: 12, height: 50, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  loginButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 17 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 25 },
  footerText: { color: 'rgba(255,255,255,0.85)', fontSize: 15 },
  signupText: { color: '#fff', fontWeight: 'bold', fontSize: 15, marginLeft: 6, textDecorationLine: 'underline' },
});