// src/screens/QuestHubScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db, auth } from '../firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { rerollDailyQuest, useSkipToGainReroll, assignDailyQuests } from '../dailyQuestUtils';

export default function QuestHubScreen({ navigation }) {
  const [dailyQuests, setDailyQuests] = useState([]);
  const [score, setScore] = useState(0);
  const [rerollTokens, setRerollTokens] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkDailyQuests = async () => {
      const user = auth.currentUser;
      if (user) await assignDailyQuests();
    };
    checkDailyQuests();
  }, []);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) { setLoading(false); return; }

    const userDocRef = doc(db, 'Users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data();
        setDailyQuests(userData.dailyQuests || []);
        setScore(userData.score || 0);
        setRerollTokens(userData.rerollTokens || 0);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleReroll = async (questId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (rerollTokens <= 0) {
      Alert.alert('No Tokens', 'Purchase more using your points.');
      return;
    }
    const result = await rerollDailyQuest(questId);
    if (result.success) Alert.alert('Rerolled', result.message);
    else Alert.alert('Reroll Failed', result.message);
  };

  const handlePurchaseReroll = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (score < 50) {
      Alert.alert('Not Enough Points', 'You need 50 points to buy 1 token.');
      return;
    }
    Alert.alert('Buy Token', 'Spend 50 points for 1 Reroll Token?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Buy', onPress: async () => { await useSkipToGainReroll(); } },
    ]);
  };

  if (loading) return <View style={styles.loadingCenter}><ActivityIndicator size="large" color="#2D6A4F" /></View>;

  return (
    <View style={styles.mainContainer}>
      <View style={styles.headerBackground}>
        <SafeAreaView>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greetingText}>Daily Actions</Text>
              <Text style={styles.headerTitle}>Quest Hub</Text>
            </View>
            <View style={styles.scorePill}>
              <Ionicons name="leaf" size={16} color="#74C69D" style={{ marginRight: 5 }} />
              <Text style={styles.scoreText}>{score} PTS</Text>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* Eco Tip replacing the old Weather widget */}
        <View style={styles.weatherCard}>
          <View style={styles.weatherRow}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.weatherTemp}>Daily Eco-Tip</Text>
              <Text style={styles.weatherDesc}>Unplugging fully charged devices saves up to 10% on your monthly energy footprint.</Text>
            </View>
            <View style={styles.weatherIconBox}>
              <Ionicons name="bulb" size={28} color="#fff" />
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Today's Climate Challenges</Text>

        {dailyQuests.map((quest, index) => (
          <View key={index} style={[styles.questCard, quest.completed && styles.questCompleted]}>
            <View style={styles.cardHeader}>
              <View style={styles.titleRow}>
                <View style={[styles.difficultyDot, 
                  quest.difficulty === 'Easy' ? { backgroundColor: '#52B788' } : 
                  quest.difficulty === 'Medium' ? { backgroundColor: '#E9C46A' } : { backgroundColor: '#E76F51' }
                ]} />
                <Text style={styles.difficultyText}>{quest.difficulty}</Text>
              </View>
              <Text style={styles.pointsTag}>+{quest.points} PTS</Text>
            </View>
            
            <Text style={styles.questTitle}>{quest.title}</Text>
            <Text style={styles.questDesc}>{quest.description}</Text>

            {!quest.completed ? (
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.startButton} onPress={() => navigation.navigate('QuestDetail', { quest })}>
                  <Text style={styles.startButtonText}>Open Quest</Text>
                  <Ionicons name="arrow-forward" size={16} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.rerollBtn, rerollTokens === 0 && { backgroundColor: '#eee' }]}
                  onPress={() => handleReroll(quest.questId)}
                  disabled={rerollTokens === 0}
                >
                  <Ionicons name="dice" size={20} color={rerollTokens > 0 ? "#2D6A4F" : "#ccc"} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.completedBadge}>
                <Ionicons name="checkmark-circle" size={18} color="#2D6A4F" />
                <Text style={styles.completedText}>COMPLETED</Text>
              </View>
            )}
          </View>
        ))}

        <View style={styles.shopCard}>
          <View style={styles.shopIcon}>
            <Ionicons name="cart" size={24} color="#2D6A4F" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.shopTitle}>Token Exchange</Text>
            <Text style={styles.shopDesc}>{rerollTokens} Tokens Remaining</Text>
          </View>
          <TouchableOpacity 
            style={[styles.buyButton, score < 50 && { backgroundColor: '#ccc' }]}
            onPress={handlePurchaseReroll}
            disabled={score < 50}
          >
            <Text style={styles.buyText}>Buy (50)</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#F4F7F5' },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerBackground: { backgroundColor: '#2D6A4F', paddingBottom: 20, borderBottomLeftRadius: 25, borderBottomRightRadius: 25, paddingTop: 10 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 10 },
  greetingText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600' },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  scorePill: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignItems: 'center' },
  scoreText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  scrollContainer: { flex: 1, paddingHorizontal: 20, marginTop: -20 },
  weatherCard: { backgroundColor: '#fff', borderRadius: 16, padding: 15, marginBottom: 15, elevation: 4 },
  weatherRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  weatherTemp: { fontSize: 20, fontWeight: 'bold', color: '#1B4332', marginBottom: 4 },
  weatherDesc: { color: '#666', fontSize: 13, lineHeight: 18 },
  weatherIconBox: { backgroundColor: '#52B788', padding: 8, borderRadius: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1B4332', marginBottom: 15, marginLeft: 5 },
  questCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 15, elevation: 2 },
  questCompleted: { opacity: 0.7, backgroundColor: '#EBF4EE' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  difficultyDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  difficultyText: { fontSize: 12, fontWeight: '600', color: '#666', textTransform: 'uppercase' },
  pointsTag: { fontWeight: 'bold', color: '#2D6A4F', fontSize: 14 },
  questTitle: { fontSize: 18, fontWeight: 'bold', color: '#222', marginBottom: 5 },
  questDesc: { fontSize: 14, color: '#555', lineHeight: 20, marginBottom: 16 },
  actionRow: { flexDirection: 'row', gap: 10 },
  startButton: { flex: 1, backgroundColor: '#2D6A4F', borderRadius: 10, paddingVertical: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  startButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  rerollBtn: { width: 45, justifyContent: 'center', alignItems: 'center', borderRadius: 10, backgroundColor: '#D8F3DC' },
  completedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#D8F3DC', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  completedText: { color: '#2D6A4F', fontWeight: 'bold', fontSize: 12, marginLeft: 5 },
  shopCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 16, marginTop: 5, marginBottom: 30 },
  shopIcon: { backgroundColor: '#D8F3DC', padding: 10, borderRadius: 10, marginRight: 15 },
  shopTitle: { fontWeight: 'bold', fontSize: 16, color: '#333' },
  shopDesc: { color: '#666', fontSize: 12 },
  buyButton: { backgroundColor: '#2D6A4F', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  buyText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
});