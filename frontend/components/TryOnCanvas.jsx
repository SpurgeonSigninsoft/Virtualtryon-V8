import { useCallback, useEffect, useRef, useState } from "react";
import { createFaceLandmarker } from "../lib/vision";
import { calculateFramePose } from "../lib/geometry";
import { decodeImageFile, fitWithin } from "../lib/image";

function loadOverlay(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load the glasses image."));
    img.src = url;
  });
}

function drawOverlay(ctx, image, pose) {
  if (!image || !pose) return;
  ctx.save();
  ctx.translate(pose.x, pose.y);
  ctx.rotate(pose.angle);
  ctx.drawImage(image, -pose.width / 2, -pose.height / 2, pose.width, pose.height);
  ctx.restore();
}

export default function TryOnCanvas({ mode, frame, tuning, onBack }) {
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const detectorRef = useRef(null);
  const frameImageRef = useRef(null);
  const photoRef = useRef(null);
  const photoUrlRef = useRef(null);
  const streamRef = useRef(null);
  const animationRef = useRef(null);
  const lastDetectRef = useRef(0);
  const lastLandmarksRef = useRef(null);
  const tuningRef = useRef(tuning);
  const frameRef = useRef(frame);
  const [status, setStatus] = useState(mode === "photo" ? "Choose a face photo." : "Camera is off.");
  const [busy, setBusy] = useState(false);
  const [cameraStarted, setCameraStarted] = useState(false);

  useEffect(() => { tuningRef.current = tuning; }, [tuning]);
  useEffect(() => { frameRef.current = frame; }, [frame]);

  const renderPhoto = useCallback(() => {
    const canvas = canvasRef.current;
    const photo = photoRef.current;
    if (!canvas || !photo) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#101114";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(photo, 0, 0, canvas.width, canvas.height);

    if (lastLandmarksRef.current && frameImageRef.current) {
      const activeFrame = frameRef.current;
      const pose = calculateFramePose(
        lastLandmarksRef.current,
        canvas.width,
        canvas.height,
        false,
        activeFrame?.aspect || frameImageRef.current.naturalHeight / frameImageRef.current.naturalWidth,
        tuningRef.current
      );
      drawOverlay(ctx, frameImageRef.current, pose);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!frame?.url) return undefined;
    loadOverlay(frame.url)
      .then((img) => {
        if (cancelled) return;
        frameImageRef.current = img;
        if (mode === "photo") renderPhoto();
      })
      .catch((error) => setStatus(error.message));
    return () => { cancelled = true; };
  }, [frame?.url, mode, renderPhoto]);

  useEffect(() => {
    if (mode === "photo") renderPhoto();
  }, [tuning, frame, mode, renderPhoto]);

  async function prepareDetector(runningMode) {
    if (detectorRef.current) {
      try { detectorRef.current.close(); } catch {}
      detectorRef.current = null;
    }
    setStatus("Loading face tracking model…");
    const detector = await createFaceLandmarker(runningMode);
    detectorRef.current = detector;
    return detector;
  }

  async function handlePhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setBusy(true);
    try {
      const decoded = await decodeImageFile(file);
      if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
      photoUrlRef.current = decoded.url;
      photoRef.current = decoded.image;

      const size = fitWithin(decoded.image.naturalWidth, decoded.image.naturalHeight);
      const canvas = canvasRef.current;
      canvas.width = size.width;
      canvas.height = size.height;
      renderPhoto();

      const detector = await prepareDetector("IMAGE");
      const result = detector.detect(decoded.image);
      const landmarks = result.faceLandmarks?.[0];
      lastLandmarksRef.current = landmarks || null;
      renderPhoto();
      setStatus(landmarks ? "Face detected. Frame aligned automatically." : "No face detected. Try a clearer, front-facing photo.");
    } catch (error) {
      setStatus(error.message || "Could not process that photo.");
    } finally {
      setBusy(false);
    }
  }

  const stopCamera = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = null;
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    if (detectorRef.current) {
      try { detectorRef.current.close(); } catch {}
      detectorRef.current = null;
    }
    setCameraStarted(false);
  }, []);

  useEffect(() => () => {
    stopCamera();
    if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
  }, [stopCamera]);

  async function startCamera() {
    if (cameraStarted) return;
    setBusy(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      video.srcObject = stream;
      await video.play();

      const size = fitWithin(video.videoWidth, video.videoHeight, 1280, 900);
      const canvas = canvasRef.current;
      canvas.width = size.width;
      canvas.height = size.height;
      const detector = await prepareDetector("VIDEO");
      setCameraStarted(true);
      setStatus("Camera active. Keep your face visible.");

      const loop = () => {
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.restore();

        const now = performance.now();
        if (video.readyState >= 2 && now - lastDetectRef.current >= 55) {
          lastDetectRef.current = now;
          try {
            const result = detector.detectForVideo(video, now);
            if (result.faceLandmarks?.[0]) lastLandmarksRef.current = result.faceLandmarks[0];
          } catch (error) {
            console.error("Face tracking frame failed", error);
          }
        }

        if (lastLandmarksRef.current && frameImageRef.current) {
          const activeFrame = frameRef.current;
          const pose = calculateFramePose(
            lastLandmarksRef.current,
            canvas.width,
            canvas.height,
            true,
            activeFrame?.aspect || frameImageRef.current.naturalHeight / frameImageRef.current.naturalWidth,
            tuningRef.current
          );
          drawOverlay(ctx, frameImageRef.current, pose);
        }
        animationRef.current = requestAnimationFrame(loop);
      };
      loop();
    } catch (error) {
      stopCamera();
      if (error?.name === "NotAllowedError") setStatus("Camera permission was denied. You can go back and use a photo instead.");
      else setStatus(error.message || "Could not start the camera.");
    } finally {
      setBusy(false);
    }
  }

  function back() {
    stopCamera();
    onBack();
  }

  return (
    <section className="panel studioPanel">
      <div className="studioToolbar">
        <button type="button" className="textButton" onClick={back}>← Change mode</button>
        <div className="toolbarActions">
          {mode === "photo" ? (
            <label className="button secondaryButton">
              {busy ? "Processing…" : "Choose face photo"}
              <input className="hiddenInput" type="file" accept="image/*" disabled={busy} onChange={handlePhoto} />
            </label>
          ) : !cameraStarted ? (
            <button type="button" className="button primaryButton" disabled={busy} onClick={startCamera}>
              {busy ? "Starting…" : "Start camera"}
            </button>
          ) : (
            <button type="button" className="button secondaryButton" onClick={stopCamera}>Stop camera</button>
          )}
        </div>
      </div>

      <div className="canvasWrap">
        <canvas ref={canvasRef} width="960" height="720" className="tryOnCanvas" />
        <video ref={videoRef} className="hiddenVideo" playsInline muted />
        {mode === "photo" && !photoRef.current ? (
          <div className="canvasPlaceholder">Your full photo will appear here without cropping.</div>
        ) : null}
        {mode === "camera" && !cameraStarted ? (
          <div className="canvasPlaceholder">Camera stays off until you press “Start camera”.</div>
        ) : null}
      </div>
      <p className="statusText">{status}</p>
    </section>
  );
}
