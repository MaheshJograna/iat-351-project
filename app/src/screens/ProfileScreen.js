// src/screens/ProfileScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Image, ScrollView, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../firebaseConfig';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

const CLIMATE_TAGS = ["Energy", "Mobility", "Food", "Digital", "Home", "Consumption", "Fitness"];

const ECO_TIERS = [
  { score: 1000, title: "Global Guardian", emoji: "🌍" },
  { score: 500, title: "Forest Ranger", emoji: "🌳" },
  { score: 200, title: "River Keeper", emoji: "💧" },
  { score: 50, title: "Sprout", emoji: "🌱" },
  { score: 0, title: "Seedling", emoji: "🌰" },
];

export default function ProfileScreen() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingPic, setUploadingPic] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [titleModalVisible, setTitleModalVisible] = useState(false);
  
  const userEmail = auth.currentUser?.email;
  const displayName = userData?.userDisplayName || (userEmail ? userEmail.split('@')[0] : 'User');
  const currentScore = userData?.score || 0;

  const getEcoTitle = (score) => {
    if (score >= 1000) return "Global Guardian 🌍";
    if (score >= 500) return "Forest Ranger 🌳";
    if (score >= 200) return "River Keeper 💧";
    if (score >= 50) return "Sprout 🌱";
    return "Seedling 🌰";
  };

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) { setLoading(false); return; }
    
    const unsubscribe = onSnapshot(doc(db, 'Users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserData(data);
        if (selectedInterests.length === 0 && data.interests) {
          setSelectedInterests(data.interests);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try { await signOut(auth); } catch (e) { Alert.alert("Error", "Logout failed."); }
  };

  const pickProfilePic = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Gallery access is required to change profile picture.');
      return;
    }
    
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.3,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setUploadingPic(true);
      try {
        const base64Img = `data:image/jpeg;base64,${result.assets[0].base64}`;
        const user = auth.currentUser;
        await updateDoc(doc(db, 'Users', user.uid), { profilePic: base64Img });
      } catch (e) {
        Alert.alert("Error", "Could not upload picture.");
      } finally {
        setUploadingPic(false);
      }
    }
  };

  const toggleTag = (tag) => {
    if (selectedInterests.includes(tag)) setSelectedInterests(selectedInterests.filter(t => t !== tag));
    else setSelectedInterests([...selectedInterests, tag]);
  };

  const savePreferences = async () => {
    setSavingPrefs(true);
    try {
      const user = auth.currentUser;
      await updateDoc(doc(db, 'Users', user.uid), { interests: selectedInterests });
      Alert.alert("Saved", "Your action domains have been updated.");
    } catch (e) {
      Alert.alert("Error", "Could not update preferences.");
    } finally {
      setSavingPrefs(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2D6A4F" /></View>;

  return (
    <View style={styles.mainContainer}>
      
      <Modal visible={titleModalVisible} transparent={true} animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setTitleModalVisible(false)} activeOpacity={1}>
          <View style={styles.rankMenu}>
            <Text style={styles.rankMenuTitle}>Eco-Titles</Text>
            <Text style={styles.rankMenuSub}>Earn points by completing quests to unlock new community status ranks.</Text>
            
            {ECO_TIERS.map((tier, index) => {
              const isUnlocked = currentScore >= tier.score;
              return (
                <View key={index} style={[styles.tierRow, isUnlocked && styles.tierRowUnlocked]}>
                  <Text style={styles.tierEmoji}>{tier.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.tierTitle, isUnlocked && styles.tierTitleUnlocked]}>{tier.title}</Text>
                    <Text style={styles.tierScore}>{tier.score} pts required</Text>
                  </View>
                  {isUnlocked && <Ionicons name="checkmark-circle" size={24} color="#52B788" />}
                </View>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>


      <View style={styles.headerBackground}>
        <SafeAreaView edges={['top', 'left', 'right']}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greetingText}>Your Journey</Text>
              <Text style={styles.headerTitle}>Player Profile</Text>
            </View>
            <View style={{ width: 75, height: 32 }} />
          </View>
        </SafeAreaView>
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.cardContainer}>
          <View style={styles.profileCard}>
            <TouchableOpacity style={styles.avatarWrapper} onPress={pickProfilePic} disabled={uploadingPic}>
              {uploadingPic ? (
                 <View style={[styles.avatarCircle, { backgroundColor: '#EBF4EE' }]}>
                   <ActivityIndicator color="#2D6A4F" />
                 </View>
              ) : userData?.profilePic ? (
                 <Image source={{ uri: userData.profilePic }} style={styles.avatarImage} />
              ) : (
                 <View style={styles.avatarCircle}>
                   <Text style={styles.avatarText}>{displayName[0].toUpperCase()}</Text>
                 </View>
              )}
              <View style={styles.editIconBadge}>
                <Ionicons name="camera" size={12} color="#fff" />
              </View>
            </TouchableOpacity>
            
            <Text style={styles.nameText}>{displayName}</Text>
            
            <TouchableOpacity style={styles.titlePill} onPress={() => setTitleModalVisible(true)}>
              <Text style={styles.titlePillText}>{getEcoTitle(currentScore)}</Text>
              <Ionicons name="chevron-down" size={14} color="#2D6A4F" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
            
            <Text style={styles.emailText}>{userEmail}</Text>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Ionicons name="leaf" size={24} color="#2D6A4F" />
              <Text style={styles.statNum}>{currentScore}</Text>
              <Text style={styles.statLabel}>Eco Points</Text>
            </View>
            <View style={styles.statBox}>
              <Ionicons name="checkmark-done-circle" size={24} color="#52B788" />
              <Text style={styles.statNum}>{userData?.questsCompletedCount || 0}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statBox}>
              <Ionicons name="dice" size={24} color="#E9C46A" />
              <Text style={styles.statNum}>{userData?.rerollTokens || 0}</Text>
              <Text style={styles.statLabel}>Rerolls</Text>
            </View>
          </View>

          <View style={styles.prefsCard}>
            <Text style={styles.prefsHeader}>Action Domains</Text>
            <Text style={styles.prefsSub}>Update your preferences to change the types of quests you receive.</Text>
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
            <TouchableOpacity style={styles.savePrefsButton} onPress={savePreferences} disabled={savingPrefs}>
              {savingPrefs ? <ActivityIndicator color="#fff" /> : <Text style={styles.savePrefsText}>Update Preferences</Text>}
            </TouchableOpacity>
          </View>

          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={22} color="#E76F51" />
              <Text style={[styles.menuText, { color: '#E76F51' }]}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#F4F7F5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  headerBackground: { backgroundColor: '#2D6A4F', paddingBottom: 25, borderBottomLeftRadius: 25, borderBottomRightRadius: 25, paddingTop: 10 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 10 },
  greetingText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600' },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  rankMenu: { width: '90%', backgroundColor: '#fff', borderRadius: 24, padding: 25, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 15 },
  rankMenuTitle: { fontSize: 22, fontWeight: 'bold', color: '#1B4332', textAlign: 'center', marginBottom: 5 },
  rankMenuSub: { fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 20, lineHeight: 18 },
  tierRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, backgroundColor: '#F9FBF9', marginBottom: 10, borderWidth: 1, borderColor: '#EBF4EE' },
  tierRowUnlocked: { backgroundColor: '#EBF4EE', borderColor: '#52B788' },
  tierEmoji: { fontSize: 32, marginRight: 15 },
  tierTitle: { fontSize: 16, fontWeight: 'bold', color: '#777' },
  tierTitleUnlocked: { color: '#1B4332' },
  tierScore: { fontSize: 12, color: '#666', marginTop: 2 },

  scrollContainer: { flex: 1, marginTop: -20 },
  cardContainer: { paddingHorizontal: 20 },
  
  profileCard: { backgroundColor: '#fff', alignItems: 'center', padding: 25, borderRadius: 20, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  avatarWrapper: { position: 'relative', marginBottom: 12 },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#2D6A4F', justifyContent: 'center', alignItems: 'center' },
  avatarImage: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#eee' },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  editIconBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#52B788', width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  
  nameText: { fontSize: 22, fontWeight: 'bold', color: '#1B4332' },
  titlePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EBF4EE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginTop: 8 },
  titlePillText: { color: '#2D6A4F', fontWeight: 'bold', fontSize: 13 },
  emailText: { fontSize: 14, color: '#888', marginTop: 10 },
  
  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  statBox: { backgroundColor: '#fff', flex: 1, marginHorizontal: 4, padding: 15, borderRadius: 16, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  statNum: { fontSize: 20, fontWeight: 'bold', color: '#1B4332', marginTop: 8 },
  statLabel: { fontSize: 12, color: '#666', marginTop: 2, fontWeight: '600' },
  
  prefsCard: { backgroundColor: '#fff', padding: 20, borderRadius: 16, marginTop: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  prefsHeader: { fontSize: 18, fontWeight: 'bold', color: '#1B4332', marginBottom: 6 },
  prefsSub: { fontSize: 13, color: '#666', marginBottom: 15, lineHeight: 18 },
  tagContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  tagButton: { backgroundColor: '#f0f0f0', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  tagActive: { backgroundColor: '#2D6A4F' },
  tagText: { color: '#444', fontWeight: '600', fontSize: 13 },
  tagActiveText: { color: '#fff' },
  savePrefsButton: { backgroundColor: '#52B788', padding: 14, borderRadius: 12, alignItems: 'center' },
  savePrefsText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },

  menuContainer: { marginTop: 20 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 18, borderRadius: 16, elevation: 1, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 3 },
  menuText: { flex: 1, marginLeft: 14, fontSize: 16, fontWeight: '700' },
});