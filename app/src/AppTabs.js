// src/AppTabs.js
import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from './firebaseConfig.js';
import { doc, onSnapshot } from 'firebase/firestore'; 
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import QuestHubStack from './QuestHubStack'; 
import ProfileScreen from './screens/ProfileScreen';
import CommunityScreen from './screens/CommunityScreen'; 
import OnboardingScreen from './screens/OnboardingScreen';

const Tab = createBottomTabNavigator();

export default function AppTabs() {
  const [onboardingStatus, setOnboardingStatus] = useState(null); 
  const insets = useSafeAreaInsets();
  
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const userDocRef = doc(db, 'Users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setOnboardingStatus(docSnap.data().onboardingComplete === true);
      } else {
        setOnboardingStatus(false);
      }
    }, () => setOnboardingStatus(true));

    return () => unsubscribe();
  }, []);

  if (onboardingStatus === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2D6A4F" />
      </View>
    ); 
  }

  if (onboardingStatus === false) {
    return <OnboardingScreen />;
  }

  return (
    <Tab.Navigator
      initialRouteName="QuestHub"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          height: 55 + insets.bottom, 
          paddingBottom: insets.bottom, 
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'QuestHub') {
            iconName = focused ? 'leaf' : 'leaf-outline'; 
          } else if (route.name === 'Community') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person-circle' : 'person-circle-outline';
          } 
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2D6A4F', 
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="QuestHub" component={QuestHubStack} options={{ tabBarLabel: 'Quests' }} />
      <Tab.Screen name="Community" component={CommunityScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});