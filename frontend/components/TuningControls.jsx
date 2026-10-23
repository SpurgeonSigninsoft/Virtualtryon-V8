export default function TuningControls({ tuning, onChange, onReset }) {
  const update = (key) => (event) => onChange({ ...tuning, [key]: Number(event.target.value) });

  return (
    <section className="panel">
      <div className="panelTitleRow">
        <div>
          <h2>Fit adjustment</h2>
          <p>Landmarks place the frame automatically. Use these only for fine adjustment between frame designs.</p>
        </div>
        <button type="button" className="textButton" onClick={onReset}>Reset fit</button>
      </div>
      <div className="sliders">
        <label>
          <span>Size <b>{tuning.scale.toFixed(2)}×</b></span>
          <input type="range" min="0.72" max="1.35" step="0.01" value={tuning.scale} onChange={update("scale")} />
        </label>
        <label>
          <span>Up / down <b>{tuning.yOffset.toFixed(2)}</b></span>
          <input type="range" min="-0.45" max="0.45" step="0.01" value={tuning.yOffset} onChange={update("yOffset")} />
        </label>
        <label>
          <span>Left / right <b>{tuning.xOffset.toFixed(2)}</b></span>
          <input type="range" min="-0.30" max="0.30" step="0.01" value={tuning.xOffset} onChange={update("xOffset")} />
        </label>
        <label>
          <span>Rotation <b>{tuning.rotation.toFixed(0)}°</b></span>
          <input type="range" min="-15" max="15" step="1" value={tuning.rotation} onChange={update("rotation")} />
        </label>
      </div>
    </section>
  );
}
