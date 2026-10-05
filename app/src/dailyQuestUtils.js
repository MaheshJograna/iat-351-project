// src/dailyQuestUtils.js
import { db, auth } from './firebaseConfig.js';
import { collection, doc, getDocs, getDoc, updateDoc, setDoc, query, where } from 'firebase/firestore'; 

const FREE_REROLLS_PER_DAY = 2; 
const DIFFICULTY_LEVELS = ['Easy', 'Medium', 'Hard']; 
const REROLL_COST = 50;

const getTodayDate = () => {
  return new Date().toISOString().split('T')[0];
};

const assignDailyQuests = async () => {
  const user = auth.currentUser;
  if (!user) return null;

  const todayDate = getTodayDate();
  const userDocRef = doc(db, 'Users', user.uid);

  try {
    const userDoc = await getDoc(userDocRef);
    let userData = userDoc.data();
    
    if (!userDoc.exists()) {
      userData = {
        score: 0,
        rerollTokens: FREE_REROLLS_PER_DAY,
        questsCompletedCount: 0,
        createdAt: new Date().toISOString(),
        dailyQuests: [],
        onboardingComplete: false,
        interests: []
      };
      await setDoc(userDocRef, userData);
    } else {
      if (userData.lastQuestAssignment !== todayDate) {
        await updateDoc(userDocRef, { rerollTokens: FREE_REROLLS_PER_DAY });
      }
    }

    if (userData?.dailyQuests?.length > 0 && userData.dailyQuests[0].assignedDate === todayDate) {
      return userData.dailyQuests;
    }

    const newDailyQuests = [];
    const userInterests = userData.interests || [];
    const assignedIds = new Set();
    
    for (const level of DIFFICULTY_LEVELS) {
      const q = query(collection(db, "Quests"), where("difficulty", "==", level));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const available = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        const preferred = available.filter(item => item.tags && item.tags.some(t => userInterests.includes(t)));
        const fallback = available.filter(item => !assignedIds.has(item.id));
        let selected = null;

        const uniquePreferred = preferred.filter(d => !assignedIds.has(d.id));
        if (uniquePreferred.length > 0) {
          selected = uniquePreferred[Math.floor(Math.random() * uniquePreferred.length)];
        } else if (fallback.length > 0) {
          selected = fallback[Math.floor(Math.random() * fallback.length)];
        }

        if (selected) {
          newDailyQuests.push({
            questId: selected.id,
            assignedDate: todayDate,
            completed: false, 
            title: selected.title,
            description: selected.description,
            points: selected.points,
            difficulty: selected.difficulty,
          });
          assignedIds.add(selected.id);
        }
      }
    }
    
    await updateDoc(userDocRef, { dailyQuests: newDailyQuests, lastQuestAssignment: todayDate });
    return newDailyQuests;
  } catch (error) {
    console.error("Error assigning daily quests:", error);
    return null;
  }
};

const completeDailyQuest = async (questId, points) => {
  const user = auth.currentUser;
  if (!user || !questId) return false;

  const userDocRef = doc(db, 'Users', user.uid);

  try {
    const userDoc = await getDoc(userDocRef);
    const userData = userDoc.data();
    
    let currentScore = userData?.score || 0;
    let questsCompletedCount = userData?.questsCompletedCount || 0;
    let quests = userData?.dailyQuests || [];
    
    const index = quests.findIndex(q => q.questId === questId);
    if (index === -1 || quests[index].completed) return false;

    quests[index].completed = true;
    currentScore += points;
    questsCompletedCount += 1;

    await updateDoc(userDocRef, {
      dailyQuests: quests, 
      score: currentScore, 
      questsCompletedCount: questsCompletedCount, 
    });
    
    return true;
  } catch (error) {
    console.error("Error completing quest:", error);
    return false;
  }
};

const rerollDailyQuest = async (currentQuestId) => {
  const user = auth.currentUser;
  if (!user) return { success: false, message: "User not logged in." };

  const userDocRef = doc(db, 'Users', user.uid);

  try {
    const userDoc = await getDoc(userDocRef);
    const userData = userDoc.data();
    
    let availableTokens = userData?.rerollTokens || 0;
    let currentScore = userData?.score || 0;
    let quests = userData?.dailyQuests || [];
    let userInterests = userData?.interests || [];

    if (availableTokens > 0) {
      availableTokens -= 1; 
    } else if (currentScore >= REROLL_COST) {
      currentScore -= REROLL_COST; 
    } else {
      return { success: false, message: `Reroll requires ${REROLL_COST} points or 1 token.` };
    }
    
    const questIndex = quests.findIndex(q => q.questId === currentQuestId);
    if (questIndex === -1) return { success: false, message: "Quest not found." };

    const originalDifficulty = quests[questIndex].difficulty;
    const snap = await getDocs(collection(db, "Quests"));
    const available = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(q => q.id !== currentQuestId && q.difficulty === originalDifficulty); 

    let newQuest = null;
    const preferred = available.filter(d => d.tags && d.tags.some(t => userInterests.includes(t)));
    
    if (preferred.length > 0) {
      newQuest = preferred[Math.floor(Math.random() * preferred.length)];
    } else if (available.length > 0) {
      newQuest = available[Math.floor(Math.random() * available.length)];
    } else {
      return { success: false, message: "No unique quests available." };
    }
    
    const newQuestObj = {
      questId: newQuest.id,
      assignedDate: getTodayDate(),
      completed: false, 
      title: newQuest.title,
      description: newQuest.description,
      points: newQuest.points,
      difficulty: newQuest.difficulty,
    };
    
    quests[questIndex] = newQuestObj;
    await updateDoc(userDocRef, { dailyQuests: quests, rerollTokens: availableTokens, score: currentScore });

    return { success: true, message: `Swapped to: ${newQuest.title}`, newQuest: newQuestObj };
  } catch (error) {
    console.error("Error rerolling quest:", error);
    return { success: false, message: "Error during reroll." };
  }
};

const useSkipToGainReroll = async () => {
  const user = auth.currentUser;
  if (!user) return { success: false, message: "User not logged in." };

  const userDocRef = doc(db, 'Users', user.uid);
  const SKIP_COST = 50; 

  try {
    const userDoc = await getDoc(userDocRef);
    const userData = userDoc.data();
    const currentRerolls = userData?.rerollTokens || 0;
    const currentScore = userData?.score || 0;

    if (currentScore < SKIP_COST) {
      return { success: false, message: `Need ${SKIP_COST} points to buy a token.` };
    }

    await updateDoc(userDocRef, { rerollTokens: currentRerolls + 1, score: currentScore - SKIP_COST });
    return { success: true, message: "Purchased 1 Reroll Token." };
  } catch (error) {
    return { success: false, message: "Transaction failed." };
  }
};

export { assignDailyQuests, getTodayDate, completeDailyQuest, rerollDailyQuest, useSkipToGainReroll };