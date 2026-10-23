import { spawn } from "node:child_process";
import process from "node:process";

// Run npm through the platform shell. On Windows/Node 24, directly spawning
// npm.cmd with shell:false can throw EINVAL even though npm itself works.
function runDev(prefix) {
  const command = `npm run dev --prefix ${prefix}`;
  return spawn(command, {
    stdio: "inherit",
    shell: true,
    windowsHide: false,
    env: process.env,
  });
}

const children = [runDev("frontend"), runDev("backend")];
let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      try {
        child.kill();
      } catch {
        // The OS may already have terminated the child process.
      }
    }
  }

  setTimeout(() => process.exit(code), 200);
}

for (const child of children) {
  child.on("error", (error) => {
    console.error("Failed to start a development process:", error.message);
    shutdown(1);
  });

  child.on("exit", (code) => {
    if (!shuttingDown && typeof code === "number" && code !== 0) {
      shutdown(code);
    }
  });
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
