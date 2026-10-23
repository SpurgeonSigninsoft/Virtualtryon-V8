Virtual Glasses V8.0.1 — Windows/Node 24 launcher fix

# Virtual Glasses V8

A clean rebuild focused on correct behavior before UI polish.

## What changed from V7

- Camera never opens automatically.
- First screen asks: upload a face photo or use live camera.
- No IMG.LY, no background remover, no Sharp.
- Uploaded face photos are rendered in full with preserved aspect ratio; there is no CSS crop driving the landmark math.
- Face landmarks and the visible face are mapped to the exact same canvas coordinate system.
- Live camera is mirrored visually and landmark x-coordinates are mirrored by the same rule.
- Transparent margins around uploaded glasses are trimmed locally (this is not background removal).
- Different transparent frame dimensions/aspect ratios are respected.
- Fine-adjustment sliders are included because different glasses artwork has different optical centers.
- Pages Router + client-only app + Webpack dev mode is used to reduce the V7 routing/hydration problems.

## Requirements

- Node.js 24.x
- npm
- Internet access when face tracking initializes (MediaPipe WASM/model assets are loaded from official/CDN locations).

## Run on Windows PowerShell

From the `virtual-glasses-v8` folder:

```powershell
npm.cmd run install:all
npm.cmd run self-test
npm.cmd run dev
```

Then open:

- Frontend: http://localhost:3000
- Backend health: http://localhost:5000/api/health

## How to test

1. On the first screen, choose **Upload a face photo**.
2. Upload a normal JPG/PNG/WebP face photo. The whole image should remain visible.
3. Confirm the demo glasses align near the eyes.
4. Upload a transparent PNG/WebP glasses frame. Transparent outer padding is trimmed automatically.
5. Use Fit Adjustment only if the artwork itself needs a small correction.
6. Return to the first screen and choose **Use live camera**.
7. The camera must remain OFF until you click **Start camera**.

## Notes

- Face photos: input accepts `image/*`. Actual decode support depends on the browser. JPG/JPEG, PNG, WebP, GIF, BMP and AVIF work in modern Chromium in typical cases. HEIC/HEIF is not guaranteed.
- Frame images: use transparent PNG/WebP/GIF/AVIF. JPEG does not support transparency and is intentionally not accepted by the frame uploader.
- The project saves uploaded frames under `backend/uploads`.
