# VerseTrack — Setup Guide

Follow these steps in order. Takes about 20 minutes.

---

## STEP 1 — Create a Firebase Project (Free)

1. Go to **https://console.firebase.google.com**
2. Click **"Add project"**
3. Name it `VerseTrack` → Continue
4. Disable Google Analytics (optional) → Create project

---

## STEP 2 — Enable Authentication

1. In your Firebase project, click **Authentication** in the left menu
2. Click **"Get started"**
3. Under **Sign-in method**, click **Email/Password**
4. Toggle **Enable** → Save

---

## STEP 3 — Create Firestore Database

1. Click **Firestore Database** in the left menu
2. Click **"Create database"**
3. Choose **Start in test mode** → Next
4. Pick any location (e.g. `asia-southeast1` for Philippines) → Enable

---

## STEP 4 — Set Firestore Security Rules

1. In Firestore, click the **Rules** tab
2. Replace everything with this:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Circle rules
    match /circles/{circleId} {
      // Any signed-in user can create a circle
      allow create: if request.auth != null;

      // Members can read their circle
      allow read: if request.auth != null &&
        request.auth.uid in resource.data.memberUids;

      // Members can update (join/leave/post)
      allow update: if request.auth != null &&
        request.auth.uid in resource.data.memberUids;

      // Only the creator can delete the circle
      allow delete: if request.auth != null &&
        request.auth.uid == resource.data.createdBy;

      // Prayer requests inside circles
      match /prayers/{prayerId} {
        // Members can read and create prayers
        allow read, create: if request.auth != null &&
          request.auth.uid in get(/databases/$(database)/documents/circles/$(circleId)).data.memberUids;

        // Members can update (tap to pray) and creator can delete
        allow update: if request.auth != null &&
          request.auth.uid in get(/databases/$(database)/documents/circles/$(circleId)).data.memberUids;

        // Prayer poster or circle creator can delete a prayer
        allow delete: if request.auth != null && (
          request.auth.uid == resource.data.uid ||
          request.auth.uid == get(/databases/$(database)/documents/circles/$(circleId)).data.createdBy
        );
      }
    }
  }
}
```

3. Click **Publish**

---

## STEP 5 — Get Your Firebase Config

1. Click the **gear icon** (⚙) next to "Project Overview" → **Project settings**
2. Scroll down to **"Your apps"** section
3. Click the **</>** (web) icon to add a web app
4. Name it `VerseTrack Web` → Register app
5. You'll see a config block like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "versetrack-xxxxx.firebaseapp.com",
  projectId: "versetrack-xxxxx",
  storageBucket: "versetrack-xxxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

6. **Copy these values** — you'll need them in the next step

---

## STEP 6 — Add Your Firebase Config to the App

1. Open **index.html** in any text editor (Notepad, VS Code, etc.)
2. Find this section near the top (around line 20):

```javascript
const FIREBASE_CONFIG = {
  apiKey: "PASTE_YOUR_apiKey_HERE",
  authDomain: "PASTE_YOUR_authDomain_HERE",
  ...
};
```

3. Replace each `"PASTE_YOUR_xxx_HERE"` with the real values from Step 5
4. Save the file

---

## STEP 7 — Host the App (Free with Netlify)

This is what gives you a shareable link and lets you generate an APK.

1. Go to **https://app.netlify.com** → Sign up free
2. Click **"Add new site"** → **"Deploy manually"**
3. **Drag and drop the entire `versetrack` folder** onto the page
4. Wait ~30 seconds → Netlify gives you a URL like `https://amazing-name-123.netlify.app`

That URL is your app! Share it with anyone.

---

## STEP 8 — Generate the APK (So others can install it)

1. Go to **https://www.pwabuilder.com**
2. Paste your Netlify URL → Start
3. Wait for it to analyze → Click **"Package for stores"**
4. Click **Android** → Download
5. Share the `.apk` file — anyone can install it on Android

> **To install an APK on Android:**
> Settings → Security → Allow "Install unknown apps" → tap the APK file

---

## STEP 9 — Add to iPhone Home Screen

iPhones can't use APKs, but can install via Safari:

1. Open the Netlify URL in **Safari** (not Chrome)
2. Tap the **Share button** (box with arrow)
3. Tap **"Add to Home Screen"**
4. Done — it opens full screen like a real app

---

## STEP 10 — Enable AI Features (Optional)

1. Go to **https://console.anthropic.com**
2. Create account → Go to **API Keys** → Create a key
3. Open VerseTrack → **Profile** → **AI API Key**
4. Paste your key → Save

AI summaries and Mood Reading will now work.

---

## How Circles Work

- You create a circle → get a 6-letter invite code
- Share the code with friends
- They open the app, sign up, go to Circles → Join → enter the code
- Everyone's reading progress syncs live
- Prayer requests appear for all circle members in real-time

---

## Troubleshooting

**"Firebase Not Configured" screen** — Check Step 6, make sure you replaced all the placeholder values.

**Can't sign up** — Make sure Email/Password authentication is enabled (Step 2).

**Circles not syncing** — Make sure Firestore rules are published (Step 4).

**APK won't install** — Enable "Install unknown apps" in Android settings.

---

## Your Files

```
versetrack/
├── index.html   ← The entire app
├── manifest.json ← Makes it installable
├── sw.js        ← Offline support
└── SETUP.md     ← This guide
```
