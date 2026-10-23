import { useState } from "react";
import FramePicker from "./FramePicker";
import TryOnCanvas from "./TryOnCanvas";
import TuningControls from "./TuningControls";

const DEFAULT_TUNING = { scale: 1, xOffset: 0, yOffset: 0.03, rotation: 0 };
const DEMO_FRAME = { id: "demo", name: "Demo frame", url: "/frames/demo-frame.svg", aspect: 0.34 };

export default function VirtualGlassesApp() {
  const [mode, setMode] = useState(null);
  const [frame, setFrame] = useState(DEMO_FRAME);
  const [tuning, setTuning] = useState(DEFAULT_TUNING);

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <span className="eyebrow">Virtual Glasses V8</span>
          <h1>Try-on Version</h1>
          <p>Pick a photo or use your camera to try on virtual glasses.</p>
        </div>
      </header>

      {!mode ? (
        <section className="choiceGrid">
          <button className="choiceCard" type="button" onClick={() => setMode("photo")}>
            <strong>Upload a face photo</strong>
            <span>JPG, PNG, WebP and other browser-supported image files. The entire image is preserved.</span>
          </button>
          <button className="choiceCard" type="button" onClick={() => setMode("camera")}>
            <strong>Use live camera</strong>
            <span>You will still press Start camera before the browser asks for permission.</span>
          </button>
        </section>
      ) : (
        <>
          <TryOnCanvas mode={mode} frame={frame} tuning={tuning} onBack={() => setMode(null)} />
          <FramePicker frame={frame} onFrameChange={setFrame} />
          <TuningControls tuning={tuning} onChange={setTuning} onReset={() => setTuning(DEFAULT_TUNING)} />
        </>
      )}

      <footer className="footerNote">
        Upload transparent glasses.
      </footer>
    </main>
  );
}
