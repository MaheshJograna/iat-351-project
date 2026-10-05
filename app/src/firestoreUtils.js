// src/firestoreUtils.js
import { db } from './firebaseConfig.js';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import initialQuests from './initialQuests.js';

const EXPECTED_QUEST_COUNT = initialQuests.length; 

const seedQuests = async () => {
  try {
    const questsRef = collection(db, "Quests");
    const snapshot = await getDocs(questsRef);

    if (snapshot.size < EXPECTED_QUEST_COUNT) {
      const batch = writeBatch(db);
      snapshot.docs.forEach(docSnap => batch.delete(docSnap.ref));
      initialQuests.forEach(quest => {
        const newRef = doc(questsRef);
        batch.set(newRef, quest);
      });
      await batch.commit();
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error seeding initial quests:", error);
    return false;
  }
};

export { seedQuests };