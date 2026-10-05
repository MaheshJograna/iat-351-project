// src/QuestHubStack.js
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import QuestHubScreen from './screens/QuestHubScreen';
import QuestDetailScreen from './screens/QuestDetailScreen'; 
import CameraScreen from './screens/CameraScreen';

const Stack = createNativeStackNavigator();

export default function QuestHubStack() {
  return (
    <Stack.Navigator initialRouteName="Dashboard" screenOptions={{ headerBackTitleVisible: false }}>
      <Stack.Screen name="Dashboard" component={QuestHubScreen} options={{ headerShown: false }} />
      <Stack.Screen name="QuestDetail" component={QuestDetailScreen} options={{ title: 'Quest Overview' }} />
      <Stack.Screen name="CameraScreen" component={CameraScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}