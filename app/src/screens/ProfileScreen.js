// src/screens/ProfileScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth'; 
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const userEmail = auth.currentUser?.email;
  const displayName = userEmail ? userEmail.split('@')[0] : 'EcoActioner';

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) { setLoading(false); return; }

    const unsubscribe = onSnapshot(doc(db, 'Users', user.uid), (docSnap) => {
      if (docSnap.exists()) setUserData(docSnap.data());
      setLoading(false);
    });
    return () => unsubscribe();
  }, []); 

  const handleLogout = async () => {
    try { await signOut(auth); } catch (e) { Alert.alert("Error", "Logout failed."); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2D6A4F" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{displayName[0].toUpperCase()}</Text>
        </View>
        <Text style={styles.nameText}>{displayName}</Text>
        <Text style={styles.emailText}>{userEmail}</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Ionicons name="leaf" size={24} color="#2D6A4F" />
          <Text style={styles.statNum}>{userData?.score || 0}</Text>
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

      <View style={styles.menuContainer}>
        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#E76F51" />
          <Text style={[styles.menuText, { color: '#E76F51' }]}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerCard: { backgroundColor: '#fff', alignItems: 'center', padding: 25, borderBottomLeftRadius: 25, borderBottomRightRadius: 25, elevation: 3 },
  avatarCircle: { width: 75, height: 75, borderRadius: 38, backgroundColor: '#2D6A4F', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 30, fontWeight: 'bold', color: '#fff' },
  nameText: { fontSize: 20, fontWeight: 'bold', color: '#1B4332' },
  emailText: { fontSize: 13, color: '#888', marginTop: 3 },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, marginTop: 10 },
  statBox: { backgroundColor: '#fff', flex: 1, marginHorizontal: 4, padding: 15, borderRadius: 14, alignItems: 'center', elevation: 2 },
  statNum: { fontSize: 18, fontWeight: 'bold', color: '#1B4332', marginTop: 6 },
  statLabel: { fontSize: 11, color: '#666', marginTop: 2 },
  menuContainer: { padding: 15 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 12 },
  menuText: { flex: 1, marginLeft: 12, fontSize: 15, fontWeight: '600' },
});