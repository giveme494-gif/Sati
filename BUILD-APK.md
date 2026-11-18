# Build the Sati APK (install on any Android phone)

Sati uses a custom Kotlin module (ML Kit face + pose), so Expo Go will not work.
Pick ONE of the two options below. Both give you a normal `.apk` file.

## Option A - EAS (Expo cloud build, easiest)
```bash
npm i -g eas-cli pnpm
pnpm install
eas login
eas init                                   # links the project to your Expo account
eas build --platform android --profile preview
```
When it finishes, EAS prints a download link / QR code for the APK. Open it on the phone and install.

## Option B - GitHub Actions (free, no Expo account)
1. Push this folder to a GitHub repository (branch `main`).
2. Open the repo -> Actions -> "Build Android APK" -> Run workflow.
3. When it is green, download the `sati-apk` artifact, unzip it, copy `app-release.apk` to the phone.

## Install on the phone
Settings -> allow "Install unknown apps" for your browser/file manager -> open the APK -> Install.
Open Sati -> allow Camera and Notifications.

## First-run test checklist (please do this on a real phone)
1. Put the phone in front of you, face + both shoulders in view, good light.
2. Calibration: sit in your meditation posture, confirm and save.
3. Start a session. Slouch / tilt head / raise shoulders and hold for the reminder delay (Settings).
4. You should get: Burmese voice prompt + a heads-up notification + a short vibration.
5. History tab shows the events; nothing from the camera is stored.
