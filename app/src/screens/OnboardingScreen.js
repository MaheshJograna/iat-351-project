// src/screens/OnboardingScreen.js
import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Dimensions, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../firebaseConfig';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';

const CLIMATE_TAGS = ["Energy", "Mobility", "Food", "Digital", "Home", "Consumption", "Fitness"];
const { width } = Dimensions.get('window');

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState('');
  const [selectedInterests, setSelectedInterests] = useState([]); 
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  const toggleTag = (tag) => {
    if (selectedInterests.includes(tag)) setSelectedInterests(selectedInterests.filter(t => t !== tag));
    else setSelectedInterests([...selectedInterests, tag]);
  };

  const finish = async () => {
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      Alert.alert("Error", "Please enter a valid public username.");
      return;
    }

    const user = auth.currentUser;
    if (!user) return;
    
    setLoading(true);
    try {
      // Check if username is already taken in Firestore
      const q = query(collection(db, 'Users'), where('userDisplayName', '==', trimmedName));
      const querySnapshot = await getDocs(q);
      
      const isTaken = querySnapshot.docs.some(docSnap => docSnap.id !== user.uid);
      if (isTaken) {
        Alert.alert("Username Taken", "This handle is already claimed. Please choose a different one.");
        setLoading(false);
        return;
      }

      await updateDoc(doc(db, 'Users', user.uid), {
        onboardingComplete: true,
        userDisplayName: trimmedName,
        interests: selectedInterests,
      });
    } catch (e) {
      Alert.alert("Error", "Could not save preferences.");
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = (event) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    setStep(Math.round(index));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <Ionicons name="earth" size={65} color="#fff" />
        
        {/* Progress Dots */}
        <View style={styles.pagination}>
          <View style={[styles.dot, step === 0 && styles.activeDot]} />
          <View style={[styles.dot, step === 1 && styles.activeDot]} />
          <View style={[styles.dot, step === 2 && styles.activeDot]} />
          <View style={[styles.dot, step === 3 && styles.activeDot]} />
        </View>
        <Text style={styles.swipeHint}>Swipe to continue</Text>
      </View>

      <ScrollView 
        ref={scrollRef}
        horizontal 
        pagingEnabled 
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        contentContainerStyle={styles.scrollTrack}
      >
        {/* Step 0: Welcome */}
        <View style={styles.slide}>
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <Ionicons name="leaf" size={40} color="#2D6A4F" />
            </View>
            <Text style={styles.cardHeader}>Welcome to APP NAME</Text>
            <Text style={styles.bodyText}>Turn climate anxiety into positive action. APP NAME gives you bite-sized daily challenges that make a real-world environmental impact.</Text>
          </View>
        </View>

        {/* Step 1: Identity & Accountability */}
        <View style={styles.slide}>
          <View style={styles.card}>
            <Text style={styles.cardHeader}>Your Public Handle</Text>
            <Text style={styles.bodyText}>Establish your public presence in the community feed so peers can recognize and support your actions.</Text>
            
            <TextInput 
              style={styles.input}
              placeholder="Enter public username..."
              placeholderTextColor="#888"
              value={displayName}
              onChangeText={setDisplayName}
              maxLength={20}
            />
          </View>
        </View>

        {/* Step 2: Mechanics */}
        <View style={styles.slide}>
          <View style={styles.card}>
            <Text style={styles.cardHeader}>How It Works</Text>
            
            <View style={styles.featureRow}>
              <View style={styles.featureIconBox}><Ionicons name="list" size={24} color="#52B788" /></View>
              <View style={styles.featureTextContainer}>
                <Text style={styles.featureTitle}>3 Daily Quests</Text>
                <Text style={styles.featureDesc}>You will receive three curated micro-actions every day categorized by Easy, Medium, and Hard.</Text>
              </View>
            </View>

            <View style={styles.featureRow}>
              <View style={styles.featureIconBox}><Ionicons name="dice" size={24} color="#E9C46A" /></View>
              <View style={styles.featureTextContainer}>
                <Text style={styles.featureTitle}>Reroll Economy</Text>
                <Text style={styles.featureDesc}>Task doesn't fit your day? Use your earned points to reroll for a new challenge.</Text>
              </View>
            </View>

            <View style={styles.featureRow}>
              <View style={styles.featureIconBox}><Ionicons name="people" size={24} color="#E76F51" /></View>
              <View style={styles.featureTextContainer}>
                <Text style={styles.featureTitle}>Community Feed</Text>
                <Text style={styles.featureDesc}>Share photos of your actions to earn peer awards and climb the global rankings.</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Step 3: Personalization */}
        <View style={styles.slide}>
          <View style={styles.card}>
            <Text style={styles.cardHeader}>Action Domains</Text>
            <Text style={styles.bodyText}>Select the areas you want to focus on to personalize your daily quests.</Text>
            
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
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#2D6A4F' },
  headerContainer: { alignItems: 'center', marginTop: 40, marginBottom: 20 },
  pagination: { flexDirection: 'row', marginTop: 20, gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.3)' },
  activeDot: { backgroundColor: '#fff' },
  swipeHint: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  scrollTrack: { alignItems: 'center' },
  slide: { width: width, paddingHorizontal: 20, justifyContent: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 25, elevation: 6, width: '100%' },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#EBF4EE', justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 20 },
  cardHeader: { fontSize: 24, fontWeight: 'bold', color: '#1B4332', textAlign: 'center', marginBottom: 15 },
  bodyText: { fontSize: 15, color: '#555', textAlign: 'center', lineHeight: 22, marginBottom: 25 },
  input: { borderWidth: 1, borderColor: '#ddd', backgroundColor: '#F9F9F9', padding: 15, borderRadius: 12, fontSize: 16, marginBottom: 20, color: '#333' },
  
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  featureIconBox: { width: 50, height: 50, borderRadius: 15, backgroundColor: '#F4F7F5', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  featureTextContainer: { flex: 1 },
  featureTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  featureDesc: { fontSize: 13, color: '#666', lineHeight: 18 },
  
  tagContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 30 },
  tagButton: { backgroundColor: '#f0f0f0', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  tagActive: { backgroundColor: '#2D6A4F' },
  tagText: { color: '#444', fontWeight: '600' },
  tagActiveText: { color: '#fff' },
  
  startButton: { backgroundColor: '#52B788', padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', width: '100%' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});