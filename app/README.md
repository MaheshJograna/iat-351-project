A React Native mobile application built for IAT351, focusing on Human-Computer Interaction (HCI) design principles, gamified habit loops, and a structured peer-to-peer award economy.

---

## Prerequisites & Requirements

Before you begin, ensure you have the following installed on your machine:
*   **Node.js** (LTS version recommended) - [Download Node.js](https://nodejs.org/)
*   **Git** - [Download Git](https://git-scm.com/)
*   **Expo Go App** installed on your physical iOS or Android device (available on the App Store or Google Play Store).

---

## Getting Started (Run from Scratch)

Follow these steps to clone the repository and run the app locally on your device:

### 1. Clone the Repository


### 2. Install Dependencies
Install all required project packages using npm:
```bash
npm install
```

### 3. Start the Development Server
Launch the Expo development server:
```bash
npx expo start
```
*   If you encounter cache or bundling issues, clear the cache by running:
    ```bash
    npx expo start --clear
    ```

### 4. Running on Your Phone
1. Open the **Expo Go** app on your physical device.
2. **If on iOS:** Use your phone's native Camera app to scan the QR code displayed in your terminal or browser, then tap "Open in Expo Go".
3. **If on Android:** Open Expo Go and scan the QR code directly inside the application.

---

## Core Architecture & Features
*   **Authentication & Onboarding:** Secure Firebase Auth coupled with a multi-step swipeable onboarding wizard enforcing unique public handles for social accountability.
*   **Quest Hub:** Dynamic daily micro-actions (Easy, Medium, Hard) backed by real-time Firestore synchronization and a point-to-token reroll economy.
*   **Proof & Community Feed:** Camera and GPS-tagged proof submissions feeding into a dual-mode (Global / Following) community feed with informed-consent point gifting and post-reporting moderation flags.
*   **Rankings:** Real-time user leaderboard featuring search functionality and direct follow/unfollow capabilities.

---

## Development Team
*   Team Member 1
*   Team Member 2
*   Team Member 3
*   Team Member 4
*   Team Member 5
*   Course: IAT351