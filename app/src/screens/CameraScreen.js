// src/screens/CameraScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator, SafeAreaView, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { completeDailyQuest } from '../dailyQuestUtils';

const { width } = Dimensions.get('window');
// Calculate a square frame size based on device width
const FRAME_SIZE = width - 30; 

export default function CameraScreen({ navigation, route }) {
  const { quest } = route.params || {}; 
  const [permission, requestPermission] = useCameraPermissions();
  
  const [photo, setPhoto] = useState(null); 
  const [base64Image, setBase64Image] = useState(null); 
  const [uploading, setUploading] = useState(false); 
  const cameraRef = useRef(null);

  useEffect(() => {
    (async () => {
      if (!permission?.granted) await requestPermission();
    })();
  }, []);

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photoData = await cameraRef.current.takePictureAsync({ 
            quality: 0.3, 
            base64: true, 
            skipProcessing: true 
        });
        
        setPhoto(photoData.uri);
        setBase64Image(`data:image/jpeg;base64,${photoData.base64}`);
      } catch (err) {
        Alert.alert("Error", "Could not capture frame.");
      }
    }
  };

  const handlePost = async () => {
    if (!base64Image) return;
    setUploading(true);

    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Error", "User not logged in.");
      setUploading(false);
      return;
    }

    try {
      await addDoc(collection(db, 'CommunityPosts'), {
        userId: user.uid,
        userDisplayName: user.email ? user.email.split('@')[0] : 'EcoActioner',
        dareTitle: quest?.title || 'Daily Quest',
        dareDescription: quest?.description || '',
        dareDifficulty: quest?.difficulty || 'Medium',
        imageURL: base64Image, 
        timestamp: serverTimestamp(),
        likes: 0,
        pointsAwarded: quest?.points || 0
      });

      if (quest) {
        await completeDailyQuest(quest.questId, quest.points);
      }

      Alert.alert("Success!", "Photo shared to the community.");
      navigation.popToTop();
    } catch (e) {
      console.error(e);
      Alert.alert("Upload Error", "Failed to upload verification.");
    } finally {
      setUploading(false);
    }
  };

  if (!permission?.granted) {
    return (
      <View style={styles.container}>
        <Text style={{ color: '#fff', marginTop: 80 }}>Camera access is required.</Text>
        <TouchableOpacity style={styles.permButton} onPress={requestPermission}>
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Grant Permissions</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerArea}>
        <Text style={styles.headerText}>{photo ? "Verify Photo" : "Capture Action"}</Text>
      </View>

      <View style={styles.cameraFrame}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.cameraView} resizeMode="cover" />
        ) : (
          <CameraView style={styles.cameraView} ref={cameraRef} facing="back" />
        )}
      </View>

      <View style={styles.controlsArea}>
        {photo ? (
          uploading ? (
            <ActivityIndicator size="large" color="#52B788" />
          ) : (
            <View style={styles.previewButtons}>
              <TouchableOpacity style={styles.retakeButton} onPress={() => { setPhoto(null); setBase64Image(null); }}>
                <Ionicons name="close-circle-outline" size={28} color="#ccc" />
                <Text style={{ color: '#ccc', fontSize: 14, marginTop: 4 }}>Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.postButton} onPress={handlePost}>
                <Text style={styles.buttonText}>Share to Community</Text>
                <Ionicons name="send" size={18} color="#fff" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            </View>
          )
        ) : (
          <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
            <View style={styles.innerCapture} />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', alignItems: 'center' },
  headerArea: { height: 70, justifyContent: 'center', alignItems: 'center' },
  headerText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  cameraFrame: { width: FRAME_SIZE, height: FRAME_SIZE, borderRadius: 20, overflow: 'hidden', backgroundColor: '#111' },
  cameraView: { flex: 1, width: '100%', height: '100%' },
  controlsArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  captureButton: { width: 75, height: 75, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  innerCapture: { width: 58, height: 58, borderRadius: 30, backgroundColor: '#fff' },
  previewButtons: { flexDirection: 'row', width: '100%', paddingHorizontal: 30, justifyContent: 'space-between', alignItems: 'center' },
  retakeButton: { alignItems: 'center', padding: 10 },
  postButton: { flexDirection: 'row', backgroundColor: '#2D6A4F', paddingVertical: 16, paddingHorizontal: 24, borderRadius: 30, alignItems: 'center', elevation: 5 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  permButton: { marginTop: 20, backgroundColor: '#2D6A4F', padding: 12, borderRadius: 8 },
});