let modulePromise;

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";

async function visionModule() {
  if (!modulePromise) modulePromise = import("@mediapipe/tasks-vision");
  return modulePromise;
}

export async function createFaceLandmarker(runningMode) {
  const { FilesetResolver, FaceLandmarker } = await visionModule();
  const fileset = await FilesetResolver.forVisionTasks(WASM_URL);

  const options = {
    baseOptions: { modelAssetPath: MODEL_URL },
    runningMode,
    numFaces: 1,
    minFaceDetectionConfidence: 0.5,
    minFacePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
    outputFaceBlendshapes: false,
    outputFacialTransformationMatrixes: false,
  };

  try {
    return await FaceLandmarker.createFromOptions(fileset, {
      ...options,
      baseOptions: { ...options.baseOptions, delegate: "GPU" },
    });
  } catch (gpuError) {
    console.warn("GPU face tracking unavailable; using CPU.", gpuError);
    return FaceLandmarker.createFromOptions(fileset, options);
  }
}
