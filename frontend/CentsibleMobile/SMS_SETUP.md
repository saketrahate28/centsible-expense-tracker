# SMS tracking setup (Android)

## 1. Custom dev client (required)

`react-native-get-sms-android` does **not** work in Expo Go.

```bash
cd frontend/CentsibleMobile
npm install
npx expo prebuild --platform android
npx expo run:android
```

Or cloud build:

```bash
npx eas build --profile development --platform android
npx expo start --dev-client
```

## 2. Database migration (backend)

```bash
cd CentsibleBackend/src/Centsible.Api
dotnet ef database update --project ../Centsible.Infrastructure
```

## 3. What was fixed

- Real OS permission flow (`READ_SMS` + `RECEIVE_SMS`)
- Dedup on re-sync (`dedupKey` in SQLite + `SmsDedupKey` on server)
- Chunked historical sync with progress
- Online recovery queue (`flushSyncQueue` + `markAsSynced`)
- Merged dashboard (local + API)
- User's own account on SMS API (not hardcoded seed account)
- Foreground incremental sync when app is active

## 4. Real-time native receiver

After `expo prebuild`, add Kotlin receiver `SmsExpenseReceiver` under `android/app/src/main/java/com/centsible/app/` that emits `onSmsReceived` to React Native. The config plugin `./plugins/withSmsReceiver` registers the manifest entry.

Until native code is added, **foreground sync** runs when the app opens and when SMS tracking is enabled in Profile.
