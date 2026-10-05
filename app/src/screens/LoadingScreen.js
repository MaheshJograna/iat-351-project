// src/screens/LoadingScreen.js
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons'; 

export default function LoadingScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="leaf" size={70} color="#fff" />
        </View>
        <Text style={styles.title}> APP NAME </Text>
        <Text style={styles.subtitle}>Micro-Actions for Macro Impact</Text>
        <ActivityIndicator size="large" color="#fff" style={styles.spinner} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#2D6A4F', justifyContent: 'center', alignItems: 'center' },
  content: { alignItems: 'center' },
  iconContainer: { marginBottom: 20, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 50, padding: 20 },
  title: { fontSize: 36, fontWeight: 'bold', color: '#fff', letterSpacing: 2 },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.85)', marginBottom: 40, marginTop: 8 },
  spinner: { marginTop: 10 },
});