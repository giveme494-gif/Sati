# နည်းပညာဆိုင်ရာ ကိုးကားချက်များ

- Google ML Kit Face Detection, Android: https://developers.google.com/ml-kit/vision/face-detection/android — bundled `com.google.mlkit:face-detection:16.1.7` model is included in the app (about 6.9 MB); eye-open probabilities require classification mode; head yaw/roll/pitch values are available. Google documents Android API 23+ minimum and warns that face size/orientation affect results.
- Google ML Kit Pose Detection, Android: https://developers.google.com/ml-kit/vision/pose-detection/android — bundled `com.google.mlkit:pose-detection:18.0.0-beta5` provides 33 pose landmarks and streaming mode. It is explicitly marked beta, requires Android API 23+, and adds about 10.1 MB including code/model.
- Expo local modules / module config: https://docs.expo.dev/modules/module-config/ and https://docs.expo.dev/modules/module-api/ — Android module registration uses `expo-module.config.json`; the native bridge is scoped to Android.
- Expo Camera: https://docs.expo.dev/versions/latest/sdk/camera/ — CameraView provides Android preview and still capture; this app processes each temporary captured image locally, then deletes it.
- Expo Audio: https://docs.expo.dev/versions/latest/sdk/audio/ — bundled local audio assets are playable without runtime text-to-speech calls.

The native-model choice keeps inference local but increases app size by roughly 17 MB before compression (face and pose model estimates); actual APK/AAB size must be measured after build. Eye closure detection is probabilistic and does not measure eye strain or intent.
