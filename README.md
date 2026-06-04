# FinTrack Pro

FinTrack Pro is a comprehensive finance tracker application built with React, TypeScript, and Firebase. It allows users to track expenses, manage family budgets, and gain insights into their spending habits.

## Features

- **Dashboard**: Real-time overview of balance, income, and expenses.
- **Transactions**: Full CRUD for financial records with filtering and search.
- **Family Sync**: Share budgets and track expenses with family members using a unique code.
- **Budgets**: Set monthly limits per category and receive alerts.
- **SMS Import**: Smart parser for bank transaction SMS messages.
- **Data Export**: Export records to CSV or PDF.
- **Backup/Restore**: Full data portability via JSON backups.
- **Dark Mode**: Support for both light and dark themes.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- A Firebase project

### Local Development

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd fintrack-pro
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up Firebase**:
   - Create a project in the [Firebase Console](https://console.firebase.google.com/).
   - Enable **Authentication** (Google and Email/Password).
   - Create a **Firestore Database**.
   - Copy your Firebase configuration and create a `firebase-applet-config.json` file in the root directory:
     ```json
     {
       "apiKey": "YOUR_API_KEY",
       "authDomain": "YOUR_AUTH_DOMAIN",
       "projectId": "YOUR_PROJECT_ID",
       "storageBucket": "YOUR_STORAGE_BUCKET",
       "messagingSenderId": "YOUR_MESSAGING_SENDER_ID",
       "appId": "YOUR_APP_ID",
       "firestoreDatabaseId": "(default)"
     }
     ```

4. **Deploy Firestore Rules**:
   - Copy the contents of `firestore.rules` to the Rules tab in your Firebase Console.

5. **Run the development server**:
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:3000`.

### Environment Variables

Create a `.env` file in the root directory and add the following:
```env
GEMINI_API_KEY=your_gemini_api_key
```

## Android App

This project is configured with **Capacitor** to run as a native Android application.

### Prerequisites for Android

- **Android Studio**: Installed on your machine.
- **Android SDK**: Configured within Android Studio.

### Building for Android

1.  **Sync the project**:
    This command builds the web app and copies the assets to the Android project.
    ```bash
    npm run android:sync
    ```

2.  **Open in Android Studio**:
    ```bash
    npm run android:open
    ```

3.  **Run on Emulator or Device**:
    Inside Android Studio, select your target device and click the **Run** button.

### Native Features

The app includes several native Android features:

#### Biometric Authentication
Use your fingerprint or face scanner to log in securely.
- **Setup**: Enable biometrics in your phone settings.
- **Usage**: Click "Login with Biometrics" on the login screen.

#### Push Notifications
Receive real-time alerts for budget limits and important updates.
- **Setup**: To enable remote notifications, add your `google-services.json` to `android/app/` and re-sync.
- **Local Alerts**: The app automatically sends local notifications when you reach 80% or 100% of your budget.

#### SMS Transaction Logging
Automatically log transactions from bank SMS.
- **Incoming SMS**: The app listens for incoming SMS and parses them using regex to identify amounts and categories.
- **Permissions**: Ensure you grant "SMS" permissions when prompted.

#### Customization
- **Icons & Splash Screen**: Replace assets in `android/app/src/main/res/`.
- **App Name**: Modify `android/app/src/main/res/values/strings.xml`.

## Deployment

### Deploying via AI Studio

1. **Share**: Click the "Share" button in the AI Studio header to create a public preview link.
2. **Cloud Run**: Use the "Deploy to Cloud Run" option in the settings menu for a production-ready deployment.

### Manual Deployment (e.g., Vercel, Netlify)

1. **Build the application**:
   ```bash
   npm run build
   ```
2. **Deploy the `dist` folder**:
   Upload the contents of the `dist` directory to your preferred static hosting provider.
3. **Configure Environment Variables**:
   Ensure `GEMINI_API_KEY` is set in your hosting provider's environment settings.

## Security

The application uses Firebase Security Rules to ensure that:
- Users can only read/write their own data.
- Family data is only accessible to members of that family.
- Critical fields like `role` are protected from unauthorized updates.

## License

MIT
