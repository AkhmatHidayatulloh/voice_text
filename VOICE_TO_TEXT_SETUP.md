# Voice-to-Text Setup

Fitur: `TextInput` (textarea, teks putih) + tombol mic yang mengubah suara jadi teks via `@react-native-voice/voice` (native speech recognition — bukan API, jadi butuh koneksi dan rebuild native, bukan cuma reload JS). Teks muncul live sambil bicara (partial results), tidak perlu menunggu tombol stop ditekan.

## File yang terlibat
- `VoiceTextScreen.tsx` — komponen utama
- `App.tsx` — memanggil `VoiceTextScreen`
- `android/app/src/main/AndroidManifest.xml` — permission `RECORD_AUDIO`
- `ios/voice_text/Info.plist` — `NSMicrophoneUsageDescription` + `NSSpeechRecognitionUsageDescription`
- `patches/@react-native-voice+voice+3.2.4.patch` — **wajib ikut di-copy**, isinya fix Gradle + fix native module (lihat bagian Bug di bawah)

## Cara pindah ke project real

1. **Install dependency**
   ```
   npm install @react-native-voice/voice
   npm install -D patch-package
   ```
   Copy folder `patches/` ke project tujuan, lalu tambahkan di `package.json`:
   ```json
   "scripts": { "postinstall": "patch-package" }
   ```
   Jalankan `npm install` sekali lagi supaya patch ter-apply ke `node_modules`.

2. **Copy file** `VoiceTextScreen.tsx` ke project tujuan, lalu render dari layar yang diinginkan.

3. **Android** — tambahkan di `android/app/src/main/AndroidManifest.xml`, di dalam `<manifest>`:
   ```xml
   <uses-permission android:name="android.permission.RECORD_AUDIO" />
   ```

4. **iOS** — tambahkan di `ios/<AppName>/Info.plist`:
   ```xml
   <key>NSMicrophoneUsageDescription</key>
   <string>Butuh akses mikrofon untuk mengubah suara menjadi teks.</string>
   <key>NSSpeechRecognitionUsageDescription</key>
   <string>Butuh akses speech recognition untuk mengubah suara menjadi teks.</string>
   ```
   Lalu jalankan:
   ```
   cd ios && pod install
   ```

5. **Rebuild native** (wajib, karena native module baru — reload JS/Fast Refresh tidak cukup):
   ```
   npx react-native run-android
   npx react-native run-ios
   ```

6. **Testing**: jalankan di device/emulator fisik dengan mic. Emulator Android butuh mic host di-enable di AVD settings; iOS Simulator meneruskan mic Mac.

## Bug di `@react-native-voice/voice` 3.2.4 dan fix-nya (sudah dipatch)

Library ini **deprecated** dan terakhir diupdate untuk toolchain Android lama, jadi 2 hal ini pasti kejadian di project modern (compileSdk 33+, Gradle 8+, New Architecture):

1. **Build gagal**: `android/build.gradle` bawaan-nya pakai `jcenter()` (sudah mati) + AGP 3.3.2 + Android Support Library lama, tidak kompatibel dengan Gradle/AGP modern.
   → Fix: `android/build.gradle` ditulis ulang pakai `mavenCentral()`, `compileSdkVersion`/`minSdkVersion`/`targetSdkVersion` mengikuti `rootProject.ext`, dependency support-v7 yang tidak dipakai dihapus.
2. **Runtime error `Cannot read property 'startSpeech' of null`**: modul native Android-nya salah daftar nama — `VoiceModule.java` method `getName()` mengembalikan `"RCTVoice"`, padahal JS wrapper mencari `NativeModules.Voice`. Nama tidak pernah cocok, jadi `NativeModules.Voice` selalu `null` di Android (di iOS tidak kena bug ini karena `RCT_EXPORT_MODULE` di Objective-C otomatis strip prefix "RCT").
   → Fix: `getName()` diubah jadi `return "Voice";`.

Kedua fix ini sudah tersimpan di `patches/@react-native-voice+voice+3.2.4.patch` via `patch-package`, otomatis ter-apply lagi setiap `npm install` selama script `postinstall` di atas ada.

## Catatan
- Live/partial results diaktifkan lewat `Voice.start(locale, { EXTRA_PARTIAL_RESULTS: true })` + handler `Voice.onSpeechPartialResults` di `VoiceTextScreen.tsx`. Teks dasar sebelum sesi rekam disimpan di `baseTextRef` supaya partial result tidak menimpa teks yang sudah ada.
- Jika project tujuan pakai **Expo** (bahkan bare workflow via `npx install-expo-modules`), pertimbangkan `expo-speech-recognition` sebagai gantinya — itu yang disarankan maintainer, tapi installer resminya belum tentu mendukung versi React Native paling baru (dicoba di project ini dan gagal karena RN 0.86 belum ada di tabel kompatibilitasnya).
- Locale rekam di-hardcode ke `id-ID` (lihat komentar `ponytail:` di `VoiceTextScreen.tsx`). Ganti ke locale device (`Voice.start(deviceLocale)`) atau tambahkan picker bila butuh multi-bahasa.
- Butuh koneksi internet di beberapa device Android karena speech recognition-nya berbasis Google service online, bukan on-device.
- Warning `NativeEventEmitter() was called with a non-null argument without the required addListener method` di log itu normal/tidak fatal — library lama ini belum mengimplementasikan `addListener`/`removeListeners` di native module, tapi event tetap jalan lewat mekanisme lama.
