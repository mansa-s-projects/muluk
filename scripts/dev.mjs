import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();

function readLockedPid() {
  try {
    const lockPath = path.join(root, ".next", "dev", "lock");
    const parsed = JSON.parse(fs.readFileSync(lockPath, "utf8"));
    return Number.isInteger(parsed?.pid) && parsed.pid > 0 ? parsed.pid : null;
  } catch {
    return null;
  }
}

function listMatchingPids() {
  const lockedPid = readLockedPid();
  if (lockedPid && lockedPid !== process.pid) {
    return [lockedPid];
  }

  try {
    if (process.platform === "win32") {
      const script = [
        "$root = $args[0]",
        "Get-CimInstance Win32_Process |",
        "Where-Object {",
        "  $_.Name -eq 'node.exe' -and",
        "  $_.CommandLine -like '*node_modules\\next\\dist\\server\\lib\\start-server.js*' -and",
        "  $_.CommandLine -like \"*$root*\"",
        "} |",
        "Select-Object -ExpandProperty ProcessId",
      ].join(" ");

      const output = execFileSync(
        "powershell.exe",
        ["-NoProfile", "-Command", script, root],
        { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
      );

      return output
        .split(/\r?\n/)
        .map(line => Number(line.trim()))
        .filter(pid => Number.isInteger(pid) && pid > 0 && pid !== process.pid);
    }

    const output = execFileSync("ps", ["-ax", "-o", "pid=,command="], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });

    return output
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const match = line.match(/^(\d+)\s+(.*)$/);
        if (!match) return null;
        return { pid: Number(match[1]), command: match[2] };
      })
      .filter(entry => entry && entry.pid !== process.pid)
      .filter(entry => entry.command.includes("node_modules/next/dist/server/lib/start-server.js") && entry.command.includes(root))
      .map(entry => entry.pid);
  } catch {
    return [];
  }
}

function stopPid(pid) {
  try {
    if (process.platform === "win32") {
      execFileSync("taskkill.exe", ["/PID", String(pid), "/F"], { stdio: "ignore" });
      return;
    }

    process.kill(pid, "SIGTERM");
  } catch {
    // Ignore races where the process already exited.
  }
}

for (const pid of listMatchingPids()) {
  stopPid(pid);
}

const nextBin = path.join(root, "node_modules", ".bin", process.platform === "win32" ? "next.cmd" : "next");
const escapedNextBin = nextBin.replace(/'/g, "''");

const child = process.platform === "win32"
  ? spawn("powershell.exe", ["-NoProfile", "-Command", `& '${escapedNextBin}' dev -p 3001`], {
      stdio: "inherit",
      shell: false,
      cwd: root,
      env: process.env,
    })
  : spawn(nextBin, ["dev", "-p", "3001"], {
      stdio: "inherit",
      shell: false,
      cwd: root,
      env: process.env,
    });

child.on("exit", code => {
  process.exit(code ?? 0);
});
