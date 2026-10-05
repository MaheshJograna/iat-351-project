// src/screens/QuestDetailScreen.js
import React from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { completeDailyQuest } from '../dailyQuestUtils'; 

export default function QuestDetailScreen({ navigation, route }) {
  const { quest } = route.params;

  const finalizeCompletion = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Error", "You must be logged in.");
      return;
    }

    try {
      // Post to the community feed without photo
      await addDoc(collection(db, 'CommunityPosts'), {
        userId: user.uid,
        userDisplayName: user.email ? user.email.split('@')[0] : 'EcoActioner',
        dareTitle: quest?.title || 'Daily Quest',
        dareDescription: quest?.description || '',
        dareDifficulty: quest?.difficulty || 'Medium',
        imageURL: null,
        timestamp: serverTimestamp(),
        likes: 0,
        pointsAwarded: quest?.points || 0
      });

      // Award the points and mark the quest complete
      const success = await completeDailyQuest(quest.questId, quest.points); 
      
      if (success) {
        Alert.alert("Action Logged!", `${quest.points} points awarded and shared to the feed.`);
        navigation.popToTop();
      } else {
        Alert.alert("Notice", "Quest already completed or unavailable.");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not complete quest.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>{quest.title}</Text>
        <Text style={styles.description}>{quest.description}</Text>
        <Text style={styles.points}>Reward: {quest.points} Points</Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.cameraButton} onPress={() => navigation.navigate('CameraScreen', { quest })}>
            <Ionicons name="camera" size={22} color="white" />
            <Text style={styles.buttonText}>Share a photo to the community</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.completeButton} onPress={finalizeCompletion}>
            <Ionicons name="checkmark-circle" size={22} color="white" />
            <Text style={styles.buttonText}>Complete Without Photo</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4F7F5' },
  container: { flex: 1, padding: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 12, textAlign: 'center', color: '#1B4332' },
  description: { fontSize: 18, textAlign: 'center', marginBottom: 20, color: '#444', lineHeight: 24 },
  points: { fontSize: 20, color: '#2D6A4F', marginBottom: 40, fontWeight: '700' },
  buttonContainer: { width: '100%' },
  cameraButton: { flexDirection: 'row', backgroundColor: '#2D6A4F', padding: 15, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  completeButton: { flexDirection: 'row', backgroundColor: '#52B788', padding: 15, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16, marginLeft: 8 },
});