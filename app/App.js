// App.js
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AuthStack from './src/AuthStack.js'; 
import AppTabs from './src/AppTabs.js'; 
import LoadingScreen from './src/screens/LoadingScreen.js'; 
import { auth } from './src/firebaseConfig.js';
import { seedQuests } from './src/firestoreUtils.js';

export default function App() {
  const [initializing, setInitializing] = useState(true); 
  const [user, setUser] = useState(null); 

  useEffect(() => {
    seedQuests();
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (initializing) setTimeout(() => setInitializing(false), 1000);
    });
    return unsubscribe;
  }, [initializing]);

  if (initializing) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        {user ? <AppTabs /> : <AuthStack />}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}