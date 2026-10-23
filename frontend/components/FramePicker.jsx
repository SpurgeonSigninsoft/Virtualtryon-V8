import { useEffect, useRef, useState } from "react";
import { trimTransparentFrame } from "../lib/image";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function FramePicker({ frame, onFrameChange }) {
  const [frames, setFrames] = useState([
    { id: "demo", name: "Demo frame", url: "/frames/demo-frame.svg", aspect: 0.34 },
  ]);
  const [message, setMessage] = useState("");
  const localUrlRef = useRef(null);

  useEffect(() => {
    fetch(`${API}/api/frames`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        const remote = (data.frames || []).map((item) => ({ ...item, url: `${API}${item.url}` }));
        setFrames((current) => [current[0], ...remote]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => () => {
    if (localUrlRef.current) URL.revokeObjectURL(localUrlRef.current);
  }, []);

  async function uploadFrame(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      setMessage("Preparing transparent frame…");
      const prepared = await trimTransparentFrame(file);
      const aspect = prepared.height / prepared.width;
      if (localUrlRef.current) URL.revokeObjectURL(localUrlRef.current);
      const localUrl = URL.createObjectURL(prepared.blob);
      localUrlRef.current = localUrl;
      const localFrame = { id: `local-${Date.now()}`, name: file.name, url: localUrl, aspect };
      setFrames((current) => [current[0], localFrame, ...current.slice(1)]);
      onFrameChange(localFrame);
      setMessage("Frame ready. Transparent padding was trimmed automatically.");

      const form = new FormData();
      form.append("frame", prepared.blob, `${file.name.replace(/\.[^.]+$/, "") || "frame"}.png`);
      form.append("aspect", String(aspect));
      const response = await fetch(`${API}/api/frames`, { method: "POST", body: form });
      if (response.ok) {
        const saved = await response.json();
        const savedFrame = { ...saved.frame, url: `${API}${saved.frame.url}` };
        setFrames((current) => [current[0], savedFrame, ...current.filter((item) => item.id !== localFrame.id && item.id !== "demo")]);
        onFrameChange(savedFrame);
        setMessage("Frame uploaded and selected.");
      } else {
        setMessage("Frame works locally, but the backend could not save it.");
      }
    } catch (error) {
      setMessage(error.message || "Could not use that frame image.");
    }
  }

  return (
    <section className="panel">
      <div className="panelTitleRow">
        <div>
          <h2>Glasses frame</h2>
          <p>Upload a frame with its background already transparent.</p>
        </div>
        <label className="button secondaryButton">
          Upload frame
          <input className="hiddenInput" type="file" accept="image/png,image/webp,image/gif,image/avif" onChange={uploadFrame} />
        </label>
      </div>

      <div className="frameStrip">
        {frames.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`frameTile ${frame?.id === item.id ? "selected" : ""}`}
            onClick={() => onFrameChange(item)}
          >
            <img src={item.url} alt="" />
            <span>{item.name}</span>
          </button>
        ))}
      </div>
      {message ? <p className="statusText">{message}</p> : null}
    </section>
  );
}
