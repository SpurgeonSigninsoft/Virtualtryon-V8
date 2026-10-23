import assert from "node:assert/strict";

function framePose(points, frameRatio = 0.34) {
  const left = points.leftEye;
  const right = points.rightEye;
  const dx = right.x - left.x;
  const dy = right.y - left.y;
  const eyeDistance = Math.hypot(dx, dy);
  const width = eyeDistance * 2.2;
  return {
    x: (left.x + right.x) / 2,
    y: (left.y + right.y) / 2,
    width,
    height: width * frameRatio,
    angle: Math.atan2(dy, dx),
  };
}

const pose = framePose({ leftEye: { x: 300, y: 250 }, rightEye: { x: 500, y: 250 } });
assert.equal(pose.x, 400);
assert.equal(pose.y, 250);
assert.equal(pose.width, 440.00000000000006);
assert.ok(Math.abs(pose.angle) < 1e-10);
assert.ok(pose.height > 0);
console.log("V8 geometry self-test passed.");
