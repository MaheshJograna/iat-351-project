// src/screens/OnboardingScreen.js
import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Dimensions, TextInput, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../firebaseConfig';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

const CLIMATE_TAGS = ["Energy", "Mobility", "Food", "Digital", "Home", "Consumption", "Fitness"];
const { width } = Dimensions.get('window');

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState('');
  const [selectedInterests, setSelectedInterests] = useState([]); 
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const insets = useSafeAreaInsets();

  const toggleTag = (tag) => {
    if (selectedInterests.includes(tag)) setSelectedInterests(selectedInterests.filter(t => t !== tag));
    else setSelectedInterests([...selectedInterests, tag]);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      Alert.alert("Error", "Could not return to login.");
    }
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
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      
      <TouchableOpacity 
        style={[styles.backButton, { top: Math.max(insets.top + 10, 40) }]} 
        onPress={handleLogout}
      >
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      <View style={[styles.headerContainer, { marginTop: insets.top + 15 }]}>
        <Ionicons name="earth" size={65} color="#fff" />
        
        {/* Updated Pagination to 5 dots */}
        <View style={styles.pagination}>
          <View style={[styles.dot, step === 0 && styles.activeDot]} />
          <View style={[styles.dot, step === 1 && styles.activeDot]} />
          <View style={[styles.dot, step === 2 && styles.activeDot]} />
          <View style={[styles.dot, step === 3 && styles.activeDot]} />
          <View style={[styles.dot, step === 4 && styles.activeDot]} />
        </View>
        <Text style={styles.swipeHint}>Swipe to continue</Text>
      </View>

      <ScrollView 
        ref={scrollRef}
        horizontal 
        pagingEnabled 
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        keyboardShouldPersistTaps="handled" 
      >
        {/* Slide 0 */}
        <View style={styles.slide}>
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <Ionicons name="leaf" size={40} color="#2D6A4F" />
            </View>
            <Text style={styles.cardHeader}>Welcome to (App Name)</Text>
            <Text style={styles.bodyText}>Turn climate anxiety into positive action. (App Name) gives you bite-sized daily challenges that make a real-world environmental impact.</Text>
          </View>
        </View>

        {/* Slide 1 */}
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
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
            />
          </View>
        </View>

        {/* Slide 2 */}
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

        {/* Slide 3 (NEW) */}
        <View style={styles.slide}>
          <View style={styles.card}>
            <Text style={styles.cardHeader}>Ranks & Rewards</Text>
            
            <View style={styles.featureRow}>
              <View style={styles.featureIconBox}><Text style={{ fontSize: 24 }}>🌍</Text></View>
              <View style={styles.featureTextContainer}>
                <Text style={styles.featureTitle}>Eco-Titles</Text>
                <Text style={styles.featureDesc}>Earn points to upgrade your profile status from a tiny Seedling to a Global Guardian.</Text>
              </View>
            </View>

            <View style={styles.featureRow}>
              <View style={styles.featureIconBox}><Ionicons name="camera" size={24} color="#52B788" /></View>
              <View style={styles.featureTextContainer}>
                <Text style={styles.featureTitle}>Share Your Story</Text>
                <Text style={styles.featureDesc}>Add an optional photo and caption when completing a quest to inspire your peers.</Text>
              </View>
            </View>

            <View style={styles.featureRow}>
              <View style={styles.featureIconBox}><Ionicons name="gift" size={24} color="#E9C46A" /></View>
              <View style={styles.featureTextContainer}>
                <Text style={styles.featureTitle}>Peer Encouragement</Text>
                <Text style={styles.featureDesc}>Spend your earned points to send digital awards to community members.</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Slide 4 */}
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#2D6A4F' }, 
  backButton: { position: 'absolute', left: 20, zIndex: 10, padding: 10 },
  headerContainer: { alignItems: 'center', marginBottom: 10 },
  pagination: { flexDirection: 'row', marginTop: 20, gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.3)' },
  activeDot: { backgroundColor: '#fff' },
  swipeHint: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  slide: { width: width, height: '100%', paddingHorizontal: 20, justifyContent: 'center', paddingBottom: 100 }, 
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