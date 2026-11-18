package expo.modules.sativision

import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.face.Face
import com.google.mlkit.vision.face.FaceDetection
import com.google.mlkit.vision.face.FaceDetector
import com.google.mlkit.vision.face.FaceDetectorOptions
import com.google.mlkit.vision.pose.Pose
import com.google.mlkit.vision.pose.PoseDetection
import com.google.mlkit.vision.pose.PoseDetector
import com.google.mlkit.vision.pose.PoseDetectorOptions
import com.google.mlkit.vision.pose.PoseLandmark
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlin.math.min

class SatiVisionModule : Module() {
  private var faceDetector: FaceDetector? = null
  private var poseDetector: PoseDetector? = null

  private fun getFaceDetector(): FaceDetector {
    return faceDetector ?: FaceDetection.getClient(
      FaceDetectorOptions.Builder()
        .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_FAST)
        .setClassificationMode(FaceDetectorOptions.CLASSIFICATION_MODE_ALL)
        .setLandmarkMode(FaceDetectorOptions.LANDMARK_MODE_NONE)
        .build()
    ).also { faceDetector = it }
  }

  private fun getPoseDetector(): PoseDetector {
    return poseDetector ?: PoseDetection.getClient(
      PoseDetectorOptions.Builder()
        .setDetectorMode(PoseDetectorOptions.SINGLE_IMAGE_MODE)
        .build()
    ).also { poseDetector = it }
  }

  override fun definition() = ModuleDefinition {
    Name("SatiVision")

    Function("capabilities") {
      mapOf(
        "faceDetection" to true,
        "poseDetection" to true,
        "processing" to "on-device"
      )
    }

    AsyncFunction("analyzeImage") { imageUri: String, promise: Promise ->
      val context = appContext.reactContext
      if (context == null) {
        promise.reject("E_CONTEXT", "Android application context is unavailable.", null)
        return@AsyncFunction
      }

      try {
        val image = InputImage.fromFilePath(context, Uri.parse(imageUri))
        getFaceDetector().process(image)
          .addOnSuccessListener { faces ->
            getPoseDetector().process(image)
              .addOnSuccessListener { pose ->
                val upright = image.rotationDegrees == 90 || image.rotationDegrees == 270
                val uprightWidth = if (upright) image.height else image.width
                val uprightHeight = if (upright) image.width else image.height
                promise.resolve(buildResult(faces.firstOrNull(), pose, uprightWidth, uprightHeight))
              }
              .addOnFailureListener { error ->
                promise.reject("E_POSE", error.message ?: "Pose detection failed.", error)
              }
          }
          .addOnFailureListener { error ->
            promise.reject("E_FACE", error.message ?: "Face detection failed.", error)
          }
      } catch (error: Exception) {
        promise.reject("E_IMAGE", error.message ?: "Could not read the temporary camera frame.", error)
      }
    }

    OnDestroy {
      faceDetector?.close()
      poseDetector?.close()
      faceDetector = null
      poseDetector = null
    }
  }

  private fun buildResult(face: Face?, pose: Pose, imageWidth: Int, imageHeight: Int): Map<String, Any?> {
    val faceResult = face?.let {
      val minDimension = min(it.boundingBox.width(), it.boundingBox.height())
      // ML Kit does not expose a face confidence score; use face pixel size only as a quality gate.
      val sizeQuality = when {
        minDimension >= 64 -> 0.85
        minDimension >= 40 -> 0.62
        minDimension >= 28 -> 0.45
        else -> 0.25
      }
      mapOf(
        "yaw" to it.headEulerAngleY.toDouble(),
        "pitch" to it.headEulerAngleX.toDouble(),
        "roll" to it.headEulerAngleZ.toDouble(),
        "leftEyeOpenProbability" to it.leftEyeOpenProbability?.toDouble(),
        "rightEyeOpenProbability" to it.rightEyeOpenProbability?.toDouble(),
        "confidence" to sizeQuality
      )
    }

    val landmarkNames = linkedMapOf(
      PoseLandmark.NOSE to "nose",
      PoseLandmark.LEFT_EYE to "leftEye",
      PoseLandmark.RIGHT_EYE to "rightEye",
      PoseLandmark.LEFT_EAR to "leftEar",
      PoseLandmark.RIGHT_EAR to "rightEar",
      PoseLandmark.LEFT_SHOULDER to "leftShoulder",
      PoseLandmark.RIGHT_SHOULDER to "rightShoulder",
      PoseLandmark.LEFT_ELBOW to "leftElbow",
      PoseLandmark.RIGHT_ELBOW to "rightElbow",
      PoseLandmark.LEFT_WRIST to "leftWrist",
      PoseLandmark.RIGHT_WRIST to "rightWrist",
      PoseLandmark.LEFT_HIP to "leftHip",
      PoseLandmark.RIGHT_HIP to "rightHip",
      PoseLandmark.LEFT_KNEE to "leftKnee",
      PoseLandmark.RIGHT_KNEE to "rightKnee",
      PoseLandmark.LEFT_ANKLE to "leftAnkle",
      PoseLandmark.RIGHT_ANKLE to "rightAnkle",
      PoseLandmark.LEFT_HEEL to "leftHeel",
      PoseLandmark.RIGHT_HEEL to "rightHeel",
      PoseLandmark.LEFT_FOOT_INDEX to "leftFootIndex",
      PoseLandmark.RIGHT_FOOT_INDEX to "rightFootIndex"
    )

    val landmarks = mutableMapOf<String, Map<String, Double>>()
    for ((landmarkType, name) in landmarkNames) {
      val point = pose.getPoseLandmark(landmarkType) ?: continue
      val confidence = point.inFrameLikelihood.toDouble().coerceIn(0.0, 1.0)
      landmarks[name] = mapOf(
        "x" to (point.position.x.toDouble() / imageWidth),
        "y" to (point.position.y.toDouble() / imageHeight),
        "confidence" to confidence
      )
    }

    // Seated meditators often have hips/legs out of frame or crossed; only the landmarks the
    // rule engine actually requires (nose + both shoulders) decide pose confidence.
    val upperBodyConfidence = listOf(
      PoseLandmark.NOSE,
      PoseLandmark.LEFT_SHOULDER,
      PoseLandmark.RIGHT_SHOULDER
    ).mapNotNull { pose.getPoseLandmark(it)?.inFrameLikelihood?.toDouble() }
      .map { it.coerceIn(0.0, 1.0) }
    val poseConfidence = if (upperBodyConfidence.isEmpty()) 0.0 else upperBodyConfidence.average()
    val poseResult = if (landmarks.isEmpty()) null else mapOf(
      "landmarks" to landmarks,
      "confidence" to poseConfidence
    )

    return mapOf(
      "timestamp" to System.currentTimeMillis(),
      "face" to faceResult,
      "pose" to poseResult
    )
  }
}
