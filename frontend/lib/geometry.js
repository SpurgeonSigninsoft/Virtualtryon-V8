const avg = (landmarks, indexes) => {
  const values = indexes.map((index) => landmarks[index]).filter(Boolean);
  return {
    x: values.reduce((sum, point) => sum + point.x, 0) / values.length,
    y: values.reduce((sum, point) => sum + point.y, 0) / values.length,
  };
};

function mapPoint(point, width, height, mirror) {
  return {
    x: (mirror ? 1 - point.x : point.x) * width,
    y: point.y * height,
  };
}

export function calculateFramePose(landmarks, canvasWidth, canvasHeight, mirror, frameAspect, tuning) {
  if (!landmarks?.length) return null;

  const leftEyeN = avg(landmarks, [33, 133, 159, 145]);
  const rightEyeN = avg(landmarks, [362, 263, 386, 374]);
  const noseN = landmarks[168] || landmarks[6] || {
    x: (leftEyeN.x + rightEyeN.x) / 2,
    y: (leftEyeN.y + rightEyeN.y) / 2,
  };

  const cheekAN = landmarks[234];
  const cheekBN = landmarks[454];

  let eyeA = mapPoint(leftEyeN, canvasWidth, canvasHeight, mirror);
  let eyeB = mapPoint(rightEyeN, canvasWidth, canvasHeight, mirror);
  if (eyeA.x > eyeB.x) [eyeA, eyeB] = [eyeB, eyeA];

  const nose = mapPoint(noseN, canvasWidth, canvasHeight, mirror);
  const eyeDx = eyeB.x - eyeA.x;
  const eyeDy = eyeB.y - eyeA.y;
  const eyeDistance = Math.hypot(eyeDx, eyeDy);
  if (!Number.isFinite(eyeDistance) || eyeDistance < 8) return null;

  const eyeMid = { x: (eyeA.x + eyeB.x) / 2, y: (eyeA.y + eyeB.y) / 2 };
  let baseWidth = eyeDistance * 2.2;

  if (cheekAN && cheekBN) {
    const cheekA = mapPoint(cheekAN, canvasWidth, canvasHeight, mirror);
    const cheekB = mapPoint(cheekBN, canvasWidth, canvasHeight, mirror);
    const faceWidth = Math.hypot(cheekB.x - cheekA.x, cheekB.y - cheekA.y);
    if (Number.isFinite(faceWidth) && faceWidth > 20) {
      const faceBased = faceWidth * 0.78;
      baseWidth = baseWidth * 0.65 + faceBased * 0.35;
    }
  }

  const width = baseWidth * tuning.scale;
  const safeAspect = Number.isFinite(frameAspect) && frameAspect > 0 ? frameAspect : 0.34;
  const height = width * safeAspect;

  const x = eyeMid.x * 0.82 + nose.x * 0.18 + eyeDistance * tuning.xOffset;
  const y = eyeMid.y + eyeDistance * tuning.yOffset;
  const angle = Math.atan2(eyeDy, eyeDx) + (tuning.rotation * Math.PI) / 180;

  return { x, y, width, height, angle };
}
