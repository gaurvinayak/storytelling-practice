// Storytelling Practice — local bridge server.
// Serves the static app and exposes ONE endpoint: POST /api/coach
// which runs the Claude CLI in headless print mode and returns parsed feedback.
//
// No external dependencies. Node 18+.
//
// Start:  node server.js   (or double-click start.cmd)
// Open:   http://localhost:4317

const http = require("http");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 4317;
const PUBLIC_DIR = path.join(__dirname, "public");
// On Windows the binary is claude.exe; allow override via env.
const CLAUDE_BIN =
  process.env.CLAUDE_BIN || (process.platform === "win32" ? "claude.exe" : "claude");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

// ---- Claude CLI bridge ------------------------------------------------------

function runClaude(prompt) {
  return new Promise((resolve, reject) => {
    const args = ["-p", "--output-format", "json"];
    let child;
    try {
      child = spawn(CLAUDE_BIN, args, { windowsHide: true });
    } catch (e) {
      return reject(new Error("Could not start Claude CLI: " + e.message));
    }

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("Claude CLI timed out after 180s."));
    }, 180000);

    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(new Error("Claude CLI error: " + e.message));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        return reject(
          new Error("Claude CLI exited " + code + (stderr ? ": " + stderr.slice(0, 500) : ""))
        );
      }
      try {
        const env = JSON.parse(stdout);
        resolve(env.result || "");
      } catch (e) {
        reject(new Error("Could not parse Claude output: " + e.message));
      }
    });

    child.stdin.write(prompt);
    child.stdin.end();
  });
}

// Pull a JSON object out of model text that may be fenced or chatty.
function extractJson(text) {
  if (!text) return null;
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first === -1 || last === -1) return null;
  try {
    return JSON.parse(t.slice(first, last + 1));
  } catch {
    return null;
  }
}

const COACH_ENVELOPE =
  '\n\n=== STUDENT SUBMISSION ===\n%INPUT%\n=== END SUBMISSION ===\n\n' +
  "Respond with ONLY a single JSON object, no prose before or after, with these keys:\n" +
  '{\n' +
  '  "verdict": "one punchy sentence — the honest headline judgment",\n' +
  '  "score": <integer 0-100>,\n' +
  '  "strengths": ["specific things that work, quoting their words"],\n' +
  '  "fixes": ["specific, actionable changes — name the exact line/word to change and how"],\n' +
  '  "rewrite": "a sharper version demonstrating the fix, or empty string if not useful"\n' +
  '}\n' +
  "Be direct and concrete, not encouraging-for-its-own-sake. A weak submission should score low. Quote their actual words.";

function buildPrompt(task, input) {
  return (task || "You are a sharp storytelling coach.") + COACH_ENVELOPE.replace("%INPUT%", input || "");
}

// ---- HTTP -------------------------------------------------------------------

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(body);
}

function serveStatic(req, res) {
  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";
  const filePath = path.join(PUBLIC_DIR, path.normalize(urlPath));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end("Not found");
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": "no-store, must-revalidate",
    });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/api/health") {
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === "POST" && req.url === "/api/coach") {
    let body = "";
    req.on("data", (c) => {
      body += c;
      if (body.length > 200000) req.destroy(); // guard
    });
    req.on("end", async () => {
      let payload;
      try {
        payload = JSON.parse(body);
      } catch {
        return sendJson(res, 400, { error: "Bad JSON" });
      }
      const { task, input } = payload;
      if (!input || !input.trim()) {
        return sendJson(res, 400, { error: "Nothing to coach — the submission is empty." });
      }
      try {
        const raw = await runClaude(buildPrompt(task, input));
        const parsed = extractJson(raw);
        if (parsed) {
          return sendJson(res, 200, { feedback: parsed, raw });
        }
        // Fall back to raw text if the model didn't return clean JSON.
        return sendJson(res, 200, {
          feedback: { verdict: "", score: null, strengths: [], fixes: [], rewrite: "" },
          raw,
        });
      } catch (e) {
        return sendJson(res, 500, { error: e.message });
      }
    });
    return;
  }

  if (req.method === "GET") return serveStatic(req, res);
  res.writeHead(405);
  res.end("Method not allowed");
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("\n  Storytelling Practice is running.");
  console.log("  Open:  http://localhost:" + PORT + "\n");
  console.log("  Coaching is powered by the Claude CLI (" + CLAUDE_BIN + ").");
  console.log("  Press Ctrl+C to stop.\n");
});
