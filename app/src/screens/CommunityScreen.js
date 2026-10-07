// src/screens/CommunityScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, TouchableOpacity, Image, RefreshControl, TextInput, Alert, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons'; 
import { db, auth } from '../firebaseConfig';
import { collection, query, orderBy, limit, getDocs, getDoc, doc, runTransaction, increment, updateDoc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
import * as Haptics from 'expo-haptics';

const AWARDS = [
  { id: 'leaf', icon: '🌱', name: 'Sprout', cost: 10 },
  { id: 'tree', icon: '🌳', name: 'Canopy', cost: 25 },
  { id: 'water', icon: '💧', name: 'Pure', cost: 50 },
  { id: 'planet', icon: '🌍', name: 'Earth Keeper', cost: 100 },
];

const getEcoTitle = (score) => {
  if (score >= 1000) return "Global Guardian 🌍";
  if (score >= 500) return "Forest Ranger 🌳";
  if (score >= 200) return "River Keeper 💧";
  if (score >= 50) return "Sprout 🌱";
  return "Seedling 🌰";
};

const getEcoEmoji = (score) => {
  if (score >= 1000) return "🌍";
  if (score >= 500) return "🌳";
  if (score >= 200) return "💧";
  if (score >= 50) return "🌱";
  return "🌰";
};

export default function CommunityScreen() {
  const [activeTab, setActiveTab] = useState('feed'); 
  const [feedFilter, setFeedFilter] = useState('global'); 
  const [following, setFollowing] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [feed, setFeed] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [awardModalVisible, setAwardModalVisible] = useState(false);
  const [postToAward, setPostToAward] = useState(null);
  
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userDoc = await getDoc(doc(db, 'Users', currentUser.uid));
        if (userDoc.exists()) {
          setFollowing(userDoc.data().following || []);
        }
      }

      const qLeader = query(collection(db, 'Users'), orderBy('score', 'desc'), limit(50));
      const snapLeader = await getDocs(qLeader);
      const users = [];
      snapLeader.forEach((d) => {
        const dat = d.data();
        if (dat.score >= 0) users.push({ id: d.id, profilePic: dat.profilePic, displayName: dat.userDisplayName || (dat.email ? dat.email.split('@')[0] : 'User'), score: dat.score });
      });
      const ranked = users.map((u, i) => ({ ...u, rank: i + 1 }));
      setLeaderboard(ranked);

      const qFeed = query(collection(db, 'CommunityPosts'), orderBy('timestamp', 'desc'), limit(50));
      const snapFeed = await getDocs(qFeed);
      const posts = [];
      
      for (const d of snapFeed.docs) {
        const dat = d.data();
        if (!dat.flaggedCount || dat.flaggedCount < 3) {
          const authorDoc = await getDoc(doc(db, 'Users', dat.userId));
          const authorData = authorDoc.exists() ? authorDoc.data() : {};
          
          posts.push({ 
            id: d.id, 
            ...dat, 
            authorProfilePic: authorData.profilePic || null, 
            authorScore: authorData.score || 0,
            createdAt: dat.timestamp ? dat.timestamp.toDate() : new Date() 
          });
        }
      }
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
  };

  const handleToggleFollow = async (targetUserId) => {
    const user = auth.currentUser;
    if (!user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const userRef = doc(db, 'Users', user.uid);
    const isFollowing = following.includes(targetUserId);

    try {
      if (isFollowing) {
        await updateDoc(userRef, { following: arrayRemove(targetUserId) });
        setFollowing(prev => prev.filter(id => id !== targetUserId));
      } else {
        await updateDoc(userRef, { following: arrayUnion(targetUserId) });
        setFollowing(prev => [...prev, targetUserId]);
      }
      if (selectedProfile && selectedProfile.id === targetUserId) {
        setSelectedProfile(prev => ({ ...prev, isFollowing: !isFollowing }));
      }
    } catch (e) {
      console.error("Follow error", e);
    }
  };

  const handleOpenUserProfile = async (userId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const userDoc = await getDoc(doc(db, 'Users', userId));
      if (userDoc.exists()) {
        const data = userDoc.data();
        const foundRank = leaderboard.find(u => u.id === userId)?.rank || '50+';

        setSelectedProfile({
          id: userId,
          displayName: data.userDisplayName || 'User',
          profilePic: data.profilePic || null,
          score: data.score || 0,
          questsCompletedCount: data.questsCompletedCount || 0,
          rank: foundRank,
          isFollowing: following.includes(userId)
        });
        setProfileModalVisible(true);
      }
    } catch (e) {
      Alert.alert("Error", "Could not load user profile.");
    }
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

  const handleReportPost = (postId) => {
    Alert.alert("Report Post", "Flag this post for community review?", [
      { text: "Cancel", style: "cancel" },
      { text: "Report", style: "destructive", onPress: async () => {
        try {
          const postRef = doc(db, "CommunityPosts", postId);
          await updateDoc(postRef, { flaggedCount: increment(1) });
          Alert.alert("Reported", "Thank you. This post has been flagged.");
          handleRefresh();
        } catch (e) {
          Alert.alert("Error", "Could not report post.");
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

    Alert.alert(
      "Confirm Gift", 
      `This will deduct ${award.cost} points from your total score to send a ${award.name} award. Continue?`, 
      [
        { text: "Cancel", style: "cancel" },
        { text: "Send Gift", onPress: async () => {
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
        }}
      ]
    );
  };

  const getLeaderboardData = () => {
    let list = leaderboard;
    if (feedFilter === 'following') {
      const currentUserId = auth.currentUser?.uid;
      list = leaderboard.filter(u => u.id === currentUserId || following.includes(u.id));
    }
    if (searchQuery) {
      list = list.filter(u => u.displayName.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return list.map((u, index) => ({ ...u, rank: index + 1 }));
  };

  const displayData = activeTab === 'feed' 
    ? (feedFilter === 'global' ? feed : feed.filter(post => following.includes(post.userId)))
    : getLeaderboardData();

  return (
    <View style={styles.mainContainer}>
      
      {/* USER PROFILE MODAL WITH RANK & COMPLETED QUESTS */}
      <Modal visible={profileModalVisible} transparent={true} animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setProfileModalVisible(false)} activeOpacity={1}>
          <View style={styles.userPopupCard}>
            {selectedProfile && (
              <>
                <View style={styles.popupAvatarCircle}>
                  {selectedProfile.profilePic ? (
                    <Image source={{ uri: selectedProfile.profilePic }} style={styles.popupAvatarImage} />
                  ) : (
                    <Text style={styles.popupAvatarText}>{selectedProfile.displayName[0].toUpperCase()}</Text>
                  )}
                </View>
                <Text style={styles.popupName}>{selectedProfile.displayName}</Text>
                
                <View style={styles.popupTitlePill}>
                  <Text style={styles.popupTitleText}>{getEcoTitle(selectedProfile.score)} • Rank #{selectedProfile.rank}</Text>
                </View>

                <View style={styles.popupStatsRow}>
                  <View style={styles.popupStatBox}>
                    <Ionicons name="leaf" size={20} color="#2D6A4F" />
                    <Text style={styles.popupStatNum}>{selectedProfile.score}</Text>
                    <Text style={styles.popupStatLabel}>Points</Text>
                  </View>
                  <View style={styles.popupStatBox}>
                    <Ionicons name="checkmark-done-circle" size={20} color="#52B788" />
                    <Text style={styles.popupStatNum}>{selectedProfile.questsCompletedCount}</Text>
                    <Text style={styles.popupStatLabel}>Completed</Text>
                  </View>
                </View>

                {selectedProfile.id !== auth.currentUser?.uid && (
                  <TouchableOpacity 
                    style={[styles.popupFollowBtn, selectedProfile.isFollowing && styles.popupFollowingBtn]} 
                    onPress={() => handleToggleFollow(selectedProfile.id)}
                  >
                    <Text style={[styles.popupFollowText, selectedProfile.isFollowing && styles.popupFollowingText]}>
                      {selectedProfile.isFollowing ? 'Following' : 'Follow User'}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* AWARD MODAL */}
      <Modal visible={awardModalVisible} transparent={true} animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setAwardModalVisible(false)} activeOpacity={1}>
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

      {/* EXACT QUEST HUB HEADER MATCH */}
      <View style={styles.headerBackground}>
        <SafeAreaView edges={['top', 'left', 'right']}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greetingText}>Global Network</Text>
              <Text style={styles.headerTitle}>Community Hub</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </View>

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
        <View style={styles.subTabContainer}>
          <TouchableOpacity style={[styles.subTabBtn, feedFilter === 'global' && styles.activeSubTab]} onPress={() => setFeedFilter('global')}>
            <Text style={[styles.subTabText, feedFilter === 'global' && styles.activeSubTabText]}>Global</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.subTabBtn, feedFilter === 'following' && styles.activeSubTab]} onPress={() => setFeedFilter('following')}>
            <Text style={[styles.subTabText, feedFilter === 'following' && styles.activeSubTabText]}>Following</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'leaderboard' && (
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color="#777" />
            <TextInput style={styles.input} placeholder="Search members..." value={searchQuery} onChangeText={handleSearch} />
          </View>
        )}

        {loading ? <ActivityIndicator size="large" color="#2D6A4F" style={{ marginTop: 40 }} /> : (
          <FlatList
            data={displayData}
            keyExtractor={item => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={() => (
              <Text style={styles.emptyStateText}>
                {feedFilter === 'following' 
                  ? "You aren't following anyone yet! Find friends in the Rankings tab."
                  : "No items found."}
              </Text>
            )}
            renderItem={({ item }) => {
              if (activeTab === 'leaderboard') {
                const isMe = item.id === auth.currentUser?.uid;
                const isFollowing = following.includes(item.id);
                
                const isTop3 = item.rank <= 3;
                let rankDisplay = `#${item.rank}`;
                let cardStyle = [styles.leaderCard, isMe && styles.myLeaderCard];
                let rankStyle = [styles.rankNum, isMe && styles.myRankNum];

                if (item.rank === 1) {
                  rankDisplay = '🌍 1';
                  cardStyle.push({ backgroundColor: '#D8F3DC', borderColor: '#2D6A4F', borderWidth: 2 });
                  rankStyle.push({ color: '#1B4332' });
                } else if (item.rank === 2) {
                  rankDisplay = '🌿 2';
                  cardStyle.push({ backgroundColor: '#EBF4EE', borderColor: '#52B788', borderWidth: 2 });
                  rankStyle.push({ color: '#2D6A4F' });
                } else if (item.rank === 3) {
                  rankDisplay = '🍃 3';
                  cardStyle.push({ backgroundColor: '#F4F7F5', borderColor: '#74C69D', borderWidth: 2 });
                  rankStyle.push({ color: '#52B788' });
                }

                return (
                  <TouchableOpacity style={cardStyle} onPress={() => handleOpenUserProfile(item.id)}>
                    <Text style={rankStyle}>{rankDisplay}</Text>
                    {item.profilePic ? (
                      <Image source={{ uri: item.profilePic }} style={styles.smallAvatar} />
                    ) : (
                      <View style={styles.smallAvatarPlaceholder}>
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>{item.displayName[0].toUpperCase()}</Text>
                      </View>
                    )}
                    <Text style={[styles.leaderName, isMe && styles.myLeaderName]}>{item.displayName} {getEcoEmoji(item.score)}</Text>
                    <Text style={[styles.scoreText, isMe && styles.myScoreText, isTop3 && { color: '#333' }]}>{item.score} pts</Text>
                    
                    {isMe ? (
                      <View style={styles.youBadge}>
                        <Text style={styles.youBadgeText}>You</Text>
                      </View>
                    ) : (
                      <TouchableOpacity 
                        style={[styles.followBtn, isFollowing && styles.followingBtn]} 
                        onPress={() => handleToggleFollow(item.id)}
                      >
                        <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
                          {isFollowing ? 'Following' : 'Follow'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                );
              }

              const isLiked = item.likedBy && item.likedBy.includes(auth.currentUser?.uid);
              const isMyPost = item.userId === auth.currentUser?.uid;
              const diffColor = item.dareDifficulty === 'Easy' ? '#52B788' : item.dareDifficulty === 'Medium' ? '#E9C46A' : '#E76F51';

              return (
                <View style={styles.postCard}>
                  <TouchableOpacity style={styles.postHeader} onPress={() => handleOpenUserProfile(item.userId)}>
                    {item.authorProfilePic ? (
                      <Image source={{ uri: item.authorProfilePic }} style={styles.avatarImage} />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>{item.userDisplayName ? item.userDisplayName[0].toUpperCase() : '?'}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.postUser}>{item.userDisplayName} {getEcoEmoji(item.authorScore || 0)}</Text>
                      <Text style={styles.postTime}>{item.createdAt.toLocaleDateString()}</Text>
                    </View>
                    
                    {isMyPost ? (
                      <TouchableOpacity onPress={() => handleDeletePost(item.id)} style={{ padding: 6 }}>
                        <Ionicons name="trash-outline" size={20} color="#E76F51" />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity onPress={() => handleReportPost(item.id)} style={{ padding: 6 }}>
                        <Ionicons name="flag-outline" size={18} color="#888" />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>

                  <View style={styles.postContext}>
                    <View style={styles.titleRow}>
                      <Text style={[styles.diffText, { color: diffColor }]}>{item.dareDifficulty}</Text>
                      <Text style={styles.postTitle}>{item.dareTitle}</Text>
                    </View>
                    {item.dareDescription ? (
                      <Text style={styles.postDesc}>{item.dareDescription}</Text>
                    ) : null}
                  </View>

                  {item.imageURL ? (
                    <Image source={{ uri: item.imageURL }} style={styles.postImage} resizeMode="cover" />
                  ) : null}

                  {item.userCaption ? (
                    <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
                      <Text style={{ fontSize: 14, color: '#333', lineHeight: 20 }}>
                        <Text style={{ fontWeight: 'bold', color: '#1B4332' }}>{item.userDisplayName} </Text>
                        {item.userCaption}
                      </Text>
                    </View>
                  ) : null}

                  {item.awards && Object.keys(item.awards).length > 0 && (
                    <View style={styles.postAwardsContainer}>
                      {Object.entries(item.awards).map(([awardId, count]) => {
                        if (count > 0) {
                          const awardDef = AWARDS.find(a => a.id === awardId);
                          return awardDef ? (
                            <View key={awardId} style={styles.postAwardBadge}>
                              <Text style={styles.postAwardIcon}>{awardDef.icon}</Text>
                              <Text style={styles.postAwardCount}>{count}</Text>
                            </View>
                          ) : null;
                        }
                        return null;
                      })}
                    </View>
                  )}

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
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#F4F7F5' },
  
  headerBackground: { backgroundColor: '#2D6A4F', paddingBottom: 25, borderBottomLeftRadius: 25, borderBottomRightRadius: 25, paddingTop: 10 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 10 },
  greetingText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600' },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  userPopupCard: { width: '80%', backgroundColor: '#fff', borderRadius: 24, padding: 25, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 15 },
  popupAvatarCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#2D6A4F', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  popupAvatarImage: { width: 80, height: 80, borderRadius: 40 },
  popupAvatarText: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  popupName: { fontSize: 20, fontWeight: 'bold', color: '#1B4332' },
  popupTitlePill: { backgroundColor: '#EBF4EE', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 6, marginBottom: 15 },
  popupTitleText: { color: '#2D6A4F', fontWeight: 'bold', fontSize: 12 },
  popupStatsRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-around', marginBottom: 20 },
  popupStatBox: { alignItems: 'center', backgroundColor: '#F9FBF9', padding: 12, borderRadius: 12, width: '45%', borderWidth: 1, borderColor: '#EBF4EE' },
  popupStatNum: { fontSize: 18, fontWeight: 'bold', color: '#1B4332', marginTop: 4 },
  popupStatLabel: { fontSize: 11, color: '#666', marginTop: 2 },
  popupFollowBtn: { backgroundColor: '#2D6A4F', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 20, width: '100%', alignItems: 'center' },
  popupFollowingBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#2D6A4F' },
  popupFollowText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  popupFollowingText: { color: '#2D6A4F' },

  tabWrapper: { backgroundColor: 'transparent', paddingHorizontal: 15, marginTop: -20 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 4, elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
  
  awardMenu: { width: '90%', backgroundColor: '#fff', borderRadius: 24, padding: 25, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 15 },
  awardMenuTitle: { fontSize: 18, fontWeight: 'bold', color: '#1B4332', marginBottom: 20 },
  awardRow: { flexDirection: 'row', gap: 12 },
  awardOption: { alignItems: 'center', padding: 15, borderRadius: 16, backgroundColor: '#F9FBF9', width: 90, borderWidth: 1, borderColor: '#EBF4EE' },
  awardName: { fontSize: 12, fontWeight: '700', marginTop: 8, color: '#333', textAlign: 'center' },
  awardCost: { fontSize: 11, color: '#2D6A4F', fontWeight: 'bold', marginTop: 4 },
  
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: '#EBF4EE' },
  tabText: { fontWeight: '700', color: '#888', fontSize: 14 },
  activeTabText: { color: '#1B4332' },
  
  contentContainer: { flex: 1, paddingHorizontal: 15, paddingTop: 10 },
  subTabContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 15, gap: 10 },
  subTabBtn: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, backgroundColor: '#EBF4EE' },
  activeSubTab: { backgroundColor: '#2D6A4F' },
  subTabText: { color: '#2D6A4F', fontWeight: 'bold', fontSize: 13 },
  activeSubTabText: { color: '#fff' },
  emptyStateText: { textAlign: 'center', marginTop: 40, color: '#888', fontStyle: 'italic', paddingHorizontal: 20 },

  searchBar: { flexDirection: 'row', backgroundColor: '#fff', padding: 12, borderRadius: 12, alignItems: 'center', marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 5, elevation: 1 },
  input: { marginLeft: 10, flex: 1, fontSize: 16, color: '#333' },
  
  leaderCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  myLeaderCard: { backgroundColor: '#EBF4EE', borderColor: '#52B788', borderWidth: 1.5 },
  rankNum: { fontWeight: '900', color: '#52B788', width: 45, fontSize: 16 },
  myRankNum: { color: '#2D6A4F' },
  leaderName: { flex: 1, fontSize: 16, fontWeight: '700', color: '#222', marginLeft: 10 },
  myLeaderName: { color: '#1B4332', fontWeight: '900' },
  scoreText: { fontWeight: '900', color: '#1B4332', fontSize: 16 },
  myScoreText: { color: '#2D6A4F' },
  
  smallAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#eee' },
  smallAvatarPlaceholder: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#52B788', justifyContent: 'center', alignItems: 'center' },

  followBtn: { backgroundColor: '#EBF4EE', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 15, marginLeft: 10 },
  followingBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#EBF4EE' },
  followBtnText: { color: '#2D6A4F', fontWeight: 'bold', fontSize: 12 },
  followingBtnText: { color: '#777' },

  youBadge: { backgroundColor: '#2D6A4F', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 15, marginLeft: 10 },
  youBadgeText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },

  postCard: { backgroundColor: '#fff', borderRadius: 20, marginBottom: 20, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  postHeader: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  avatarImage: { width: 42, height: 42, borderRadius: 21, marginRight: 12, backgroundColor: '#eee' },
  avatarPlaceholder: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#52B788', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  postUser: { fontWeight: '800', fontSize: 16, color: '#222' },
  postTime: { color: '#888', fontSize: 12, marginTop: 2 },
  postContext: { paddingHorizontal: 16, marginBottom: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  diffText: { fontWeight: '900', fontSize: 12, textTransform: 'uppercase', marginRight: 10, letterSpacing: 0.5 },
  postTitle: { fontWeight: '700', color: '#1B4332', fontSize: 16, flexShrink: 1 },
  postDesc: { color: '#555', fontSize: 14, lineHeight: 20 },
  postImage: { width: '100%', aspectRatio: 1, backgroundColor: '#F4F7F5' }, 
  
  postAwardsContainer: { flexDirection: 'row', paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4, flexWrap: 'wrap', gap: 8, backgroundColor: '#FAFCFA' },
  postAwardBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12, borderWidth: 1, borderColor: '#EBF4EE' },
  postAwardIcon: { fontSize: 14, marginRight: 4 },
  postAwardCount: { fontSize: 13, fontWeight: 'bold', color: '#2D6A4F' },

  socialBar: { flexDirection: 'row', padding: 14, alignItems: 'center', backgroundColor: '#FAFCFA', borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  socialBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 24 },
  socialText: { marginLeft: 6, fontSize: 14, fontWeight: '800', color: '#555' },
});