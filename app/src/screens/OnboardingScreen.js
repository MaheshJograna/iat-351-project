// src/screens/OnboardingScreen.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';

const CLIMATE_TAGS = ["Energy", "Mobility", "Food", "Digital", "Home", "Consumption", "Fitness"];

export default function OnboardingScreen() {
  const [selectedInterests, setSelectedInterests] = useState([]); 
  const [loading, setLoading] = useState(false);

  const toggleTag = (tag) => {
    if (selectedInterests.includes(tag)) setSelectedInterests(selectedInterests.filter(t => t !== tag));
    else setSelectedInterests([...selectedInterests, tag]);
  };

  const finish = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'Users', user.uid), {
        onboardingComplete: true,
        interests: selectedInterests,
      });
    } catch (e) {
      Alert.alert("Error", "Could not save preferences.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.headerContainer}>
          <Ionicons name="earth" size={50} color="#fff" />
          <Text style={styles.appTitle}>Select Focus Areas</Text>
          <Text style={styles.tagline}>Prioritize your climate micro-actions</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardHeader}>Action Domains</Text>
          <View style={styles.tagContainer}>
            {CLIMATE_TAGS.map((tag) => {
              const active = selectedInterests.includes(tag);
              return (
                <TouchableOpacity key={tag} style={[styles.tagButton, active && styles.tagActive]} onPress={() => toggleTag(tag)}>
                  <Text style={[styles.tagText, active && styles.tagActiveText]}>{tag}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity style={styles.startButton} onPress={finish} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Start Quests</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#2D6A4F' },
  scrollContainer: { flexGrow: 1, padding: 20, justifyContent: 'center' },
  headerContainer: { alignItems: 'center', marginBottom: 25 },
  appTitle: { fontSize: 26, fontWeight: 'bold', color: '#fff', marginTop: 10 },
  tagline: { fontSize: 15, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 25, elevation: 6 },
  cardHeader: { fontSize: 20, fontWeight: 'bold', color: '#1B4332', textAlign: 'center', marginBottom: 15 },
  tagContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 25 },
  tagButton: { backgroundColor: '#f0f0f0', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  tagActive: { backgroundColor: '#2D6A4F' },
  tagText: { color: '#444', fontWeight: '600' },
  tagActiveText: { color: '#fff' },
  startButton: { backgroundColor: '#52B788', padding: 15, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});