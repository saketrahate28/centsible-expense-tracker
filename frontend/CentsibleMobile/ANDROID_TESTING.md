# Android testing for Centsible (SMS features)

You do **not** need a separate random app from the Play Store. You need:

1. **Android Studio** (free) — includes the emulator and `adb`
2. **A development build** of Centsible (not Expo Go)

## Why Expo Go fails

SMS reading uses native Android code. Expo Go does not include `react-native-get-sms-android`.

## Option A — Physical Android phone (recommended)

### 1. Install Android Studio

Download: https://developer.android.com/studio

During setup, enable **Android SDK** and **Android SDK Platform-Tools** (this installs `adb`).

Add platform-tools to PATH (Windows):

```
%LOCALAPPDATA%\Android\Sdk\platform-tools
```

Restart Cursor/terminal after adding PATH.

### 2. Enable USB debugging on your phone

Settings → About phone → tap Build number 7 times → Developer options → USB debugging ON.

### 3. Build and install Centsible dev client

```powershell
cd "C:\Users\ASUS\OneDrive\Desktop\Expense Tracker\frontend\CentsibleMobile"
npm install
npx expo prebuild --platform android
npx expo run:android
```

Or build APK in the cloud:

```powershell
npx eas build --profile development --platform android
```

Install the APK on your phone, then:

```powershell
npx expo start --dev-client
```

### 4. Run the backend on your PC

```powershell
cd "C:\Users\ASUS\OneDrive\Desktop\Expense Tracker\CentsibleBackend\src\Centsible.Api"
dotnet run
```

Phone and PC must be on the **same Wi‑Fi**. The app uses your PC IP from Expo (port **5272**).

---

## Option B — Android Emulator (no physical phone)

1. Open Android Studio → Device Manager → Create Virtual Device (Pixel + API 34).
2. Start the emulator.
3. Run `npx expo run:android` — it deploys to the emulator.

Note: Emulator SMS testing is limited; use a **real device** for bank SMS sync.

---

## Fix: `'adb' is not recognized`

Install Android Studio platform-tools and add to PATH (see above), **or** run from Android Studio's terminal:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" devices
```

---

## Login without Google/Supabase

Use **phone or email OTP** on the Sign In screen. The API returns `devOtp` in the terminal when running in Development mode.

Google button uses dev login automatically until Supabase is configured.
