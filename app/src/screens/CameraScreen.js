// src/screens/CameraScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator, SafeAreaView, Dimensions, TextInput, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { completeDailyQuest } from '../dailyQuestUtils';

const { width } = Dimensions.get('window');
const FRAME_SIZE = width - 30;

export default function CameraScreen({ navigation, route }) {
  const { quest } = route.params || {};
  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState(null);
  const [base64Image, setBase64Image] = useState(null);
  const [caption, setCaption] = useState('');
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

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Gallery access is required to upload photos.');
      return;
    }
    
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.3,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPhoto(result.assets[0].uri);
      setBase64Image(`data:image/jpeg;base64,${result.assets[0].base64}`);
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
        userCaption: caption.trim(), 
        dareDifficulty: quest?.difficulty || 'Medium',
        imageURL: base64Image,
        timestamp: serverTimestamp(),
        likes: 0,
        pointsAwarded: quest?.points || 0
      });

      if (quest) {
        await completeDailyQuest(quest.questId, quest.points);
      }
      Alert.alert("Success!", "Action shared to the community.");
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
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        {/* Added keyboardVerticalOffset to push the button higher above the iOS keyboard */}
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={40} style={{ flex: 1, width: '100%', alignItems: 'center' }}>
          
          <View style={styles.headerArea}>
            <Text style={styles.headerText}>{photo ? "Add a Caption" : "Capture Action"}</Text>
          </View>

          <View style={styles.cameraFrame}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.cameraView} resizeMode="cover" />
            ) : (
              <CameraView style={styles.cameraView} ref={cameraRef} facing="back" />
            )}
          </View>

          {photo && (
            <View style={styles.captionContainer}>
              <TextInput
                style={styles.captionInput}
                placeholder="Tell the community about it... (Optional)"
                placeholderTextColor="#888"
                value={caption}
                onChangeText={setCaption}
                maxLength={120}
                multiline
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
            </View>
          )}

          <View style={styles.controlsArea}>
            {photo ? (
              uploading ? (
                <ActivityIndicator size="large" color="#52B788" />
              ) : (
                <View style={styles.previewButtons}>
                  <TouchableOpacity style={styles.retakeButton} onPress={() => { setPhoto(null); setBase64Image(null); setCaption(''); }}>
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
              <View style={styles.captureRow}>
                <TouchableOpacity style={styles.galleryButton} onPress={pickFromGallery}>
                  <Ionicons name="images" size={30} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 10, marginTop: 4 }}>Upload</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
                  <View style={styles.innerCapture} />
                </TouchableOpacity>

                <View style={{ width: 60 }} /> 
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', alignItems: 'center' },
  headerArea: { height: 70, justifyContent: 'center', alignItems: 'center' },
  headerText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  cameraFrame: { width: FRAME_SIZE, height: FRAME_SIZE, borderRadius: 20, overflow: 'hidden', backgroundColor: '#111' },
  cameraView: { flex: 1, width: '100%', height: '100%' },
  captionContainer: { width: FRAME_SIZE, marginTop: 20, backgroundColor: '#222', borderRadius: 12, padding: 10 },
  captionInput: { color: '#fff', fontSize: 15, minHeight: 40 },
  controlsArea: { flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' },
  captureRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: FRAME_SIZE, paddingHorizontal: 20 },
  galleryButton: { alignItems: 'center', width: 60 },
  captureButton: { width: 75, height: 75, borderRadius: 40, backgroundColor: 'rgba(255, 255, 255,0.3)', justifyContent: 'center', alignItems: 'center' },
  innerCapture: { width: 58, height: 58, borderRadius: 30, backgroundColor: '#fff' },
  previewButtons: { flexDirection: 'row', width: '100%', paddingHorizontal: 30, justifyContent: 'space-between', alignItems: 'center' },
  retakeButton: { alignItems: 'center', padding: 10 },
  postButton: { flexDirection: 'row', backgroundColor: '#2D6A4F', paddingVertical: 16, paddingHorizontal: 24, borderRadius: 30, alignItems: 'center', elevation: 5 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  permButton: { marginTop: 20, backgroundColor: '#2D6A4F', padding: 12, borderRadius: 8 },
});