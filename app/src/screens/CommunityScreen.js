// src/screens/CommunityScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, TouchableOpacity, Image, RefreshControl, TextInput, Alert, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons'; 
import { db, auth } from '../firebaseConfig';
import { collection, query, orderBy, limit, getDocs, doc, runTransaction, increment, updateDoc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
import * as Haptics from 'expo-haptics';

const AWARDS = [
  { id: 'leaf', icon: '🌱', name: 'Sprout', cost: 10 },
  { id: 'tree', icon: '🌳', name: 'Canopy', cost: 25 },
  { id: 'water', icon: '💧', name: 'Pure', cost: 50 },
  { id: 'planet', icon: '🌍', name: 'Earth Keeper', cost: 100 },
];

export default function CommunityScreen() {
  const [activeTab, setActiveTab] = useState('feed'); 
  const [leaderboard, setLeaderboard] = useState([]);
  const [feed, setFeed] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredLeaderboard, setFilteredLeaderboard] = useState([]);
  const [awardModalVisible, setAwardModalVisible] = useState(false);
  const [postToAward, setPostToAward] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const qLeader = query(collection(db, 'Users'), orderBy('score', 'desc'), limit(50));
      const snapLeader = await getDocs(qLeader);
      const users = [];
      snapLeader.forEach((d) => {
        const dat = d.data();
        if (dat.score >= 0) users.push({ id: d.id, displayName: dat.email ? dat.email.split('@')[0] : 'User', score: dat.score });
      });
      const ranked = users.map((u, i) => ({ ...u, rank: i + 1 }));
      setLeaderboard(ranked);
      setFilteredLeaderboard(ranked);

      const qFeed = query(collection(db, 'CommunityPosts'), orderBy('timestamp', 'desc'), limit(50));
      const snapFeed = await getDocs(qFeed);
      const posts = [];
      snapFeed.forEach((d) => {
        const dat = d.data();
        posts.push({ id: d.id, ...dat, createdAt: dat.timestamp ? dat.timestamp.toDate() : new Date() });
      });
      setFeed(posts);
    } catch (e) {
      console.error("Community data error:", e);
    }
  }, []);

  useEffect(() => {
    loadData().then(() => setLoading(false));
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (!text) setFilteredLeaderboard(leaderboard);
    else setFilteredLeaderboard(leaderboard.filter(u => u.displayName.toLowerCase().includes(text.toLowerCase())));
  };

  const handleDeletePost = (postId) => {
    Alert.alert("Delete Post", "Are you sure you want to remove this?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try {
          await deleteDoc(doc(db, "CommunityPosts", postId));
          handleRefresh();
        } catch (e) {
          Alert.alert("Error", "Could not delete post.");
        }
      }}
    ]);
  };

  const handleLike = async (post) => {
    const user = auth.currentUser;
    if (!user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const postRef = doc(db, 'CommunityPosts', post.id);
    const isLiked = post.likedBy && post.likedBy.includes(user.uid);

    try {
      if (isLiked) {
        await updateDoc(postRef, { likedBy: arrayRemove(user.uid), likes: increment(-1) });
      } else {
        await updateDoc(postRef, { likedBy: arrayUnion(user.uid), likes: increment(1) });
      }
      handleRefresh(); 
    } catch (e) {
      console.error("Like error", e);
    }
  };

  const giveAward = async (award) => {
    const user = auth.currentUser;
    if (!user || !postToAward) return;
    if (postToAward.userId === user.uid) {
      Alert.alert("Notice", "You cannot gift your own post.");
      return;
    }
    setAwardModalVisible(false);

    try {
      await runTransaction(db, async (t) => {
        const userRef = doc(db, "Users", user.uid);
        const postRef = doc(db, "CommunityPosts", postToAward.id);
        const userDoc = await t.get(userRef);
        const curScore = userDoc.data().score || 0;

        if (curScore < award.cost) throw new Error("LOW_FUNDS");

        t.update(userRef, { score: increment(-award.cost) });
        t.update(postRef, { [`awards.${award.id}`]: increment(1) });
      });
      Alert.alert("Gift Sent!", `Sent ${award.name} for ${award.cost} pts.`);
      handleRefresh();
    } catch (e) {
      if (e.message === "LOW_FUNDS") Alert.alert("Insufficient Points", `Requires ${award.cost} points.`);
      else Alert.alert("Error", "Could not send gift.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Community Feed</Text>
      </View>

      <Modal visible={awardModalVisible} transparent={true} animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setAwardModalVisible(false)}>
          <View style={styles.awardMenu}>
            <Text style={styles.awardMenuTitle}>Send Climate Encouragement</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.awardRow}>
              {AWARDS.map((award) => (
                <TouchableOpacity key={award.id} style={styles.awardOption} onPress={() => giveAward(award)}>
                  <Text style={{ fontSize: 30 }}>{award.icon}</Text>
                  <Text style={styles.awardName}>{award.name}</Text>
                  <Text style={styles.awardCost}>{award.cost} pts</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <View style={styles.tabWrapper}>
        <View style={styles.tabContainer}>
          <TouchableOpacity style={[styles.tabBtn, activeTab === 'feed' && styles.activeTab]} onPress={() => setActiveTab('feed')}>
            <Text style={[styles.tabText, activeTab === 'feed' && styles.activeTabText]}>Posts</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, activeTab === 'leaderboard' && styles.activeTab]} onPress={() => setActiveTab('leaderboard')}>
            <Text style={[styles.tabText, activeTab === 'leaderboard' && styles.activeTabText]}>Rankings</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.contentContainer}>
        {activeTab === 'leaderboard' && (
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color="#777" />
            <TextInput style={styles.input} placeholder="Search members..." value={searchQuery} onChangeText={handleSearch} />
          </View>
        )}

        {loading ? <ActivityIndicator size="large" color="#2D6A4F" style={{ marginTop: 40 }} /> : (
          <FlatList
            data={activeTab === 'feed' ? feed : filteredLeaderboard}
            keyExtractor={item => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            renderItem={({ item }) => {
              if (activeTab === 'leaderboard') {
                return (
                  <View style={styles.leaderCard}>
                    <Text style={styles.rankNum}>#{item.rank}</Text>
                    <Text style={styles.leaderName}>{item.displayName}</Text>
                    <Text style={styles.scoreText}>{item.score} pts</Text>
                  </View>
                );
              }
              const isLiked = item.likedBy && item.likedBy.includes(auth.currentUser?.uid);
              const isMyPost = item.userId === auth.currentUser?.uid;
              
              const diffColor = item.dareDifficulty === 'Easy' ? '#52B788' : item.dareDifficulty === 'Medium' ? '#E9C46A' : '#E76F51';

              return (
                <View style={styles.postCard}>
                  <View style={styles.postHeader}>
                    <View style={styles.avatarPlaceholder}><Text style={{ color: '#fff', fontWeight: 'bold' }}>{item.userDisplayName ? item.userDisplayName[0].toUpperCase() : '?'}</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.postUser}>{item.userDisplayName}</Text>
                      <Text style={styles.postTime}>{item.createdAt.toLocaleDateString()}</Text>
                    </View>
                    {isMyPost && (
                      <TouchableOpacity onPress={() => handleDeletePost(item.id)} style={{ padding: 5 }}>
                        <Ionicons name="trash-outline" size={20} color="#E76F51" />
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.postContext}>
                    <View style={styles.titleRow}>
                      <Text style={[styles.diffText, { color: diffColor }]}>{item.dareDifficulty}</Text>
                      <Text style={styles.postTitle}>{item.dareTitle}</Text>
                    </View>
                    {item.dareDescription ? (
                      <Text style={styles.postDesc}>{item.dareDescription}</Text>
                    ) : null}
                  </View>

                  {/* Conditionally render the image ONLY if it exists */}
                  {item.imageURL ? (
                    <Image source={{ uri: item.imageURL }} style={styles.postImage} resizeMode="cover" />
                  ) : null}

                  <View style={styles.socialBar}>
                    <TouchableOpacity style={styles.socialBtn} onPress={() => handleLike(item)}>
                      <Ionicons name={isLiked ? "heart" : "heart-outline"} size={22} color={isLiked ? "#E76F51" : "#444"} />
                      <Text style={styles.socialText}>{item.likes || 0}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.socialBtn} onPress={() => { setPostToAward(item); setAwardModalVisible(true); }}>
                      <Ionicons name="gift-outline" size={22} color="#2D6A4F" />
                      <Text style={[styles.socialText, { color: '#2D6A4F' }]}>Gift</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4F7F5' },
  headerContainer: { padding: 15, backgroundColor: '#fff', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1B4332' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  awardMenu: { width: '85%', backgroundColor: '#fff', borderRadius: 20, padding: 20, alignItems: 'center' },
  awardMenuTitle: { fontSize: 18, fontWeight: 'bold', color: '#1B4332', marginBottom: 15 },
  awardRow: { flexDirection: 'row', gap: 10 },
  awardOption: { alignItems: 'center', padding: 10, borderRadius: 10, backgroundColor: '#F4F7F5', width: 85 },
  awardName: { fontSize: 11, fontWeight: 'bold', marginTop: 4, color: '#333', textAlign: 'center' },
  awardCost: { fontSize: 10, color: '#2D6A4F', fontWeight: 'bold' },
  tabWrapper: { backgroundColor: '#fff', padding: 8 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#EBF4EE', borderRadius: 10, padding: 3 },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  activeTab: { backgroundColor: '#fff', elevation: 2 },
  tabText: { fontWeight: '600', color: '#777' },
  activeTabText: { color: '#2D6A4F' },
  contentContainer: { flex: 1, padding: 15 },
  searchBar: { flexDirection: 'row', backgroundColor: '#fff', padding: 10, borderRadius: 10, alignItems: 'center', marginBottom: 15 },
  input: { marginLeft: 8, flex: 1, fontSize: 15 },
  leaderCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 8 },
  rankNum: { fontWeight: 'bold', color: '#2D6A4F', width: 35 },
  leaderName: { flex: 1, fontSize: 15, fontWeight: '600', color: '#333' },
  scoreText: { fontWeight: 'bold', color: '#2D6A4F' },
  postCard: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 16, overflow: 'hidden', elevation: 2 },
  postHeader: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  avatarPlaceholder: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#2D6A4F', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  postUser: { fontWeight: 'bold', fontSize: 15, color: '#333' },
  postTime: { color: '#999', fontSize: 11 },
  postContext: { paddingHorizontal: 15, marginBottom: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  diffText: { fontWeight: 'bold', fontSize: 13, textTransform: 'uppercase', marginRight: 8 },
  postTitle: { fontWeight: 'bold', color: '#1B4332', fontSize: 15, flexShrink: 1 },
  postDesc: { color: '#555', fontSize: 13, lineHeight: 18 },
  postImage: { width: '100%', aspectRatio: 1, backgroundColor: '#eee' }, 
  socialBar: { flexDirection: 'row', padding: 10, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f4f4f4' },
  socialBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 20 },
  socialText: { marginLeft: 5, fontSize: 13, fontWeight: 'bold', color: '#444' },
});