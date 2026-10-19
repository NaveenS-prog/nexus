#!/usr/bin/env node
// ==============================================================================
// NEXUS Academic Inbox Watcher - Multi-Folder Live Ingestion Service
// ==============================================================================

import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";

// Parse CLI arguments
const args = process.argv.slice(2);
let customDirs = [];
let serverUrl = "http://localhost:3000";
let scanOnce = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--dir" || args[i] === "-d" || args[i] === "--inbox") {
    customDirs.push(args[i + 1]);
    i++;
  } else if (args[i] === "--server" || args[i] === "-s") {
    serverUrl = args[i + 1];
    i++;
  } else if (args[i] === "--once") {
    scanOnce = true;
  }
}

// Gather all watch directories
const watchDirsSet = new Set();

// 1. From CLI
for (const d of customDirs) {
  if (d) watchDirsSet.add(path.resolve(d));
}

// 2. From academic_sources.json
const sourcesConfigPath = path.join(process.cwd(), "academic_sources.json");
if (fs.existsSync(sourcesConfigPath)) {
  try {
    const json = JSON.parse(fs.readFileSync(sourcesConfigPath, "utf-8"));
    if (Array.isArray(json.sources)) {
      for (const s of json.sources) {
        if (s.enabled !== false && s.path) {
          watchDirsSet.add(path.resolve(s.path));
        }
      }
    }
  } catch {}
}

// 3. From environment variable
if (process.env.NEXUS_ACADEMIC_WATCH_DIRS) {
  const envDirs = process.env.NEXUS_ACADEMIC_WATCH_DIRS.split(/[;,]/).map((d) => d.trim());
  for (const ed of envDirs) {
    if (ed) watchDirsSet.add(path.resolve(ed));
  }
}

// 4. Default SEM 3 on D: drive if present
const sem3Path = process.platform === "win32" ? "D:\\SEM 3" : path.join(os.homedir(), "SEM 3");
if (fs.existsSync(sem3Path)) {
  watchDirsSet.add(path.resolve(sem3Path));
}

// 5. Default ~/NEXUS Academic Inbox
const defaultInbox = process.env.NEXUS_ACADEMIC_INBOX_DIR
  ? path.resolve(process.env.NEXUS_ACADEMIC_INBOX_DIR)
  : path.join(os.homedir(), "NEXUS Academic Inbox");
watchDirsSet.add(path.resolve(defaultInbox));

const watchDirs = Array.from(watchDirsSet);

const IGNORED_EXTENSIONS = new Set([
  ".crdownload",
  ".part",
  ".tmp",
  ".swp",
  ".lock",
]);

const IGNORED_DIR_NAMES = new Set([
  ".git",
  ".vscode",
  ".idea",
  "node_modules",
  "__pycache__",
  ".next",
  "dist",
  "build",
  "env",
  "venv",
]);

const activeProcessing = new Set();
const processedHashes = new Set();
const watchers = [];

// ANSI Terminal Colors
const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  dim: "\x1b[2m",
  magenta: "\x1b[35m",
};

function timestamp() {
  return new Date().toLocaleTimeString();
}

function log(msg, color = C.reset) {
  console.log(`${C.dim}[${timestamp()}]${C.reset} ${color}${msg}${C.reset}`);
}

function computeFileHash(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function inferMimeType(filename) {
  const lower = (filename || "").toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".pptx")) return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  if (lower.endsWith(".ppt")) return "application/vnd.ms-powerpoint";
  if (lower.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (lower.endsWith(".doc")) return "application/msword";
  if (lower.endsWith(".xlsx")) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (lower.endsWith(".py")) return "text/x-python";
  if (lower.endsWith(".java")) return "text/x-java-source";
  if (lower.endsWith(".c") || lower.endsWith(".cpp")) return "text/x-c";
  if (lower.endsWith(".zip")) return "application/zip";
  if (lower.endsWith(".txt") || lower.endsWith(".md")) return "text/plain";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return "application/octet-stream";
}

function extractTextSnippet(buffer) {
  try {
    const raw = buffer.toString("utf-8");
    const printable = raw.replace(/[^\x20-\x7E\t\n\r]/g, " ");
    const lines = printable
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 20);
    return lines.slice(0, 50).join("\n");
  } catch {
    return "";
  }
}

/**
 * Infers metadata from file and path hierarchy
 */
function inferFileDetails(filePath, rootDir) {
  const resolved = path.resolve(filePath);
  const rel = rootDir ? path.relative(rootDir, resolved) : path.basename(resolved);
  const parts = rel.split(path.sep);
  const baseName = path.basename(resolved);
  const ext = path.extname(resolved);
  const titleRaw = path.basename(resolved, ext);

  let courseName = "";
  let courseCode = null;
  let categoryHint = "";
  let missingFields = [];

  // 1. Directory hierarchy inspection
  if (parts.length > 1) {
    // Top directory under root is Course Name
    const topDir = parts[0].trim();
    if (topDir.length >= 2 && !["inbox", "files", "materials", "assignments", "desktop", "downloads"].includes(topDir.toLowerCase())) {
      courseName = topDir;
    }

    // Check all segments for course codes
    for (const segment of parts.slice(0, -1)) {
      const codeMatch = segment.match(/\b([A-Z]{2,5}\s?[-_ ]?\s?[0-9]{2,4}[A-Z]?)\b/i);
      if (codeMatch && !courseCode) {
        courseCode = codeMatch[1].replace(/[-_ ]/g, "").toUpperCase();
        if (!courseName) courseName = courseCode;
      }
      categoryHint += " " + segment.toLowerCase();
    }
  }

  // 2. Check filename for course code if still missing
  if (!courseName) {
    const codeMatch = titleRaw.match(/\b([A-Z]{2,5}\s?[-_ ]?\s?[0-9]{2,4}[A-Z]?)\b/i);
    if (codeMatch) {
      courseCode = codeMatch[1].replace(/[-_ ]/g, "").toUpperCase();
      courseName = courseCode;
    }
  }

  let title = titleRaw.replace(/[-_]+/g, " ").trim();

  // Strip course code from title if present
  if (courseCode) {
    title = title.replace(new RegExp(`\\b${courseCode}\\b`, "i"), "").trim();
  }

  // Check for due date in filename
  let dueAt = null;
  const dueMatch = title.match(/\bdue\s*[-_:]?\s*([A-Za-z]{3,9}\s*\d{1,2}(?:\s*\d{4})?|\d{4}-\d{2}-\d{2})\b/i);
  if (dueMatch) {
    dueAt = dueMatch[1];
    title = title.replace(dueMatch[0], "").trim();
  }

  title = title.replace(/^[:\-–\s]+|[:\-–\s]+$/g, "").trim() || titleRaw;

  // Infer item type from path hints and filename
  let itemType = "ASSIGNMENT";
  const pathAndTitle = `${categoryHint} ${title.toLowerCase()}`;
  if (/\b(question papers?|ia-?[0-9]|internal assessment|midterm|final exam|quiz|examination)\b/i.test(pathAndTitle)) {
    itemType = "EXAM";
  } else if (/\b(lab|labs|experiments?|lab experiments?)\b/i.test(pathAndTitle)) {
    itemType = "LAB";
  } else if (/\b(term project|capstone|mini project|projects?)\b/i.test(pathAndTitle)) {
    itemType = "PROJECT";
  } else if (/\b(letcures? notes?|lecture notes?|lecture slides?|slides?|class deck|unit [0-9]|unit-[0-9]|unit_[0-9])\b/i.test(pathAndTitle)) {
    itemType = "LECTURE_MATERIAL";
  } else if (/\b(reference book|reference books|reference material|textbooks?|syllabus)\b/i.test(pathAndTitle)) {
    itemType = "REFERENCE_MATERIAL";
  } else if (/\b(assignments?|homework|tasks?)\b/i.test(pathAndTitle)) {
    itemType = "ASSIGNMENT";
  }

  let needsConfirmation = false;
  if (!courseName) {
    courseName = "Pending Course Assignment";
    missingFields.push("courseName");
    needsConfirmation = true;
  }

  return {
    courseName,
    courseCode,
    title,
    dueAt,
    itemType,
    needsConfirmation,
    missingFields,
  };
}

/**
 * Checks if file writing has completed
 */
async function waitForStability(filePath) {
  const maxWait = 30000;
  const startTime = Date.now();
  let lastSize = -1;
  let stableCount = 0;

  while (Date.now() - startTime < maxWait) {
    if (!fs.existsSync(filePath)) return false;
    try {
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) return false;

      if (stats.size > 0 && stats.size === lastSize) {
        stableCount++;
        if (stableCount >= 2) {
          try {
            const fd = fs.openSync(filePath, "r");
            fs.closeSync(fd);
            return true;
          } catch {}
        }
      } else {
        lastSize = stats.size;
        stableCount = 0;
      }
    } catch {}

    await new Promise((r) => setTimeout(r, 600));
  }
  return false;
}

/**
 * Ingests file via NEXUS API or local storage fallback
 */
async function processFile(filePath, rootDir) {
  if (activeProcessing.has(filePath)) return;

  try {
    activeProcessing.add(filePath);
    const fileName = path.basename(filePath);

    if (
      fileName.startsWith(".") ||
      fileName.startsWith("~$") ||
      IGNORED_EXTENSIONS.has(path.extname(filePath).toLowerCase())
    ) {
      return;
    }

    const relPath = rootDir ? path.relative(rootDir, filePath) : fileName;
    log(`File detected: ${relPath}`, C.cyan);

    const isStable = await waitForStability(filePath);
    if (!isStable) {
      log(`File write not stable or removed: ${fileName}`, C.yellow);
      return;
    }

    const buffer = fs.readFileSync(filePath);
    const hash = computeFileHash(buffer);

    if (processedHashes.has(hash)) {
      log(`Skipping duplicate (already ingested): ${fileName}`, C.dim);
      return;
    }

    const details = inferFileDetails(filePath, rootDir);
    const mimeType = inferMimeType(fileName);
    const textSnippet = extractTextSnippet(buffer);

    const payload = {
      source: "FILE_IMPORT",
      sourceExternalId: `hash:${hash}`,
      sourceUrl: `file://${path.resolve(filePath)}`,
      courseName: details.courseName,
      courseCode: details.courseCode || undefined,
      title: details.title,
      instructions: textSnippet,
      description: textSnippet ? textSnippet.substring(0, 300) : `Imported from ${fileName}`,
      dueAt: details.dueAt,
      status: details.needsConfirmation ? "NEEDS_CONFIRMATION" : "NEW",
      attachments: [
        {
          name: fileName,
          mimeType,
          size: buffer.length,
          storagePath: path.resolve(filePath),
          contentHash: hash,
          downloadStatus: "DOWNLOADED",
          processingStatus: textSnippet ? "PROCESSED" : "NOT_PROCESSED",
          extractedText: textSnippet || undefined,
        },
      ],
      metadata: {
        sourcePath: path.resolve(filePath),
        contentHash: hash,
        needsConfirmation: details.needsConfirmation,
        missingFields: details.missingFields,
        inferredType: details.itemType,
        ingestedVia: "folder_watcher",
        ingestedAt: new Date().toISOString(),
      },
    };

    // Attempt HTTP ingestion via Next.js server
    let ingestedSuccessfully = false;
    try {
      const res = await fetch(`${serverUrl}/api/academic/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const json = await res.json();
        ingestedSuccessfully = true;
        processedHashes.add(hash);

        if (details.needsConfirmation) {
          log(`[CONFIRMATION REQUIRED] Ingested "${details.title}" with missing course metadata. Review in NEXUS.`, C.yellow);
        } else {
          log(`[SUCCESS] Ingested "${details.title}" into course "${details.courseName}" (Type: ${json.item?.type || details.itemType}).`, C.green);
        }
      }
    } catch {
      // Server offline, fall back to direct file ingestion
    }

    if (!ingestedSuccessfully) {
      // Direct local storage fallback (academic_store.json)
      const storePath = path.join(process.cwd(), "academic_store.json");
      let store = { courses: [], items: [], attachments: [], requirements: [], workspaces: [], pairings: [] };
      if (fs.existsSync(storePath)) {
        try {
          store = JSON.parse(fs.readFileSync(storePath, "utf-8"));
        } catch {}
      }

      const exists = (store.items || []).some((i) => i.sourceExternalId === `hash:${hash}`);
      if (exists) {
        processedHashes.add(hash);
        log(`File content already present in local store: ${fileName}`, C.dim);
        return;
      }

      const itemId = crypto.randomUUID();
      const courseId = crypto.randomUUID();

      let targetCourse = (store.courses || []).find((c) => c.name.toLowerCase() === details.courseName.toLowerCase());
      if (!targetCourse) {
        targetCourse = {
          id: courseId,
          name: details.courseName,
          courseCode: details.courseCode || undefined,
          source: "FILE_IMPORT",
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        store.courses.push(targetCourse);
      }

      const item = {
        id: itemId,
        source: "FILE_IMPORT",
        sourceExternalId: `hash:${hash}`,
        sourceUrl: `file://${path.resolve(filePath)}`,
        type: details.itemType,
        courseId: targetCourse.id,
        courseName: targetCourse.name,
        courseCode: targetCourse.courseCode,
        title: details.title,
        description: payload.description,
        instructions: textSnippet,
        status: details.needsConfirmation ? "NEEDS_CONFIRMATION" : "NEW",
        priority: "medium",
        metadata: payload.metadata,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const attachment = {
        id: crypto.randomUUID(),
        academicItemId: itemId,
        source: "FILE_IMPORT",
        name: fileName,
        originalName: fileName,
        mimeType,
        size: buffer.length,
        storagePath: path.resolve(filePath),
        contentHash: hash,
        downloadStatus: "DOWNLOADED",
        processingStatus: textSnippet ? "PROCESSED" : "NOT_PROCESSED",
        extractedText: textSnippet || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      store.items.unshift(item);
      store.attachments.push(attachment);
      fs.writeFileSync(storePath, JSON.stringify(store, null, 2), "utf-8");
      processedHashes.add(hash);

      if (details.needsConfirmation) {
        log(`[OFFLINE SAVED - CONFIRMATION REQUIRED] "${details.title}" saved. Open NEXUS to confirm course.`, C.yellow);
      } else {
        log(`[OFFLINE SAVED] "${details.title}" saved to "${targetCourse.name}" (${details.itemType}).`, C.green);
      }
    }
  } catch (err) {
    log(`Error processing ${filePath}: ${err.message}`, C.red);
  } finally {
    activeProcessing.delete(filePath);
  }
}

/**
 * Scans folder recursively
 */
async function scanDirectory(dir, rootDir) {
  if (!fs.existsSync(dir)) return;
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.startsWith(".") || IGNORED_DIR_NAMES.has(entry.name.toLowerCase())) {
        continue;
      }
      await scanDirectory(full, rootDir);
    } else if (entry.isFile()) {
      await processFile(full, rootDir);
    }
  }
}

console.log(`${C.bold}${C.green}======================================================${C.reset}`);
console.log(`${C.bold} NEXUS Academic Multi-Folder Watcher                 ${C.reset}`);
console.log(`${C.bold}${C.green}======================================================${C.reset}`);
console.log(`Ingestion Target  : ${C.cyan}${serverUrl}/api/academic/ingest${C.reset}`);
console.log(`Deduplication     : ${C.cyan}SHA-256 Content Hash Verification${C.reset}`);
console.log(`Watch Folders (${watchDirs.length}):`);
for (const dir of watchDirs) {
  console.log(`  - ${C.cyan}${dir}${C.reset} ${fs.existsSync(dir) ? C.green + "[ACTIVE]" + C.reset : C.yellow + "[CREATING]" + C.reset}`);
}
console.log(`Status            : ${C.green}Monitoring Real Coursework Folders${C.reset}\n`);

// Ensure directories exist and scan
for (const dir of watchDirs) {
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      log(`Created directory: ${dir}`, C.green);
    } catch {}
  }
  log(`Scanning: ${dir}...`, C.dim);
  await scanDirectory(dir, dir);
}

if (scanOnce) {
  log("Single scan (--once) finished. Exiting.", C.green);
  process.exit(0);
}

log("Watchers are actively monitoring. Drop any file to ingest automatically.\n", C.green);

// Start native recursive watchers for each directory
for (const dir of watchDirs) {
  if (!fs.existsSync(dir)) continue;
  try {
    const w = fs.watch(dir, { recursive: true }, (eventType, filename) => {
      if (!filename) return;
      const fullPath = path.join(dir, filename);
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        processFile(fullPath, dir);
      }
    });
    watchers.push(w);
  } catch (e) {
    log(`Recursive watch error on ${dir}: ${e.message}`, C.yellow);
  }
}

// Graceful shutdown
process.on("SIGINT", () => {
  console.log(`\n${C.yellow}Shutting down NEXUS Watcher...${C.reset}`);
  for (const w of watchers) {
    try { w.close(); } catch {}
  }
  process.exit(0);
});

process.on("SIGTERM", () => {
  for (const w of watchers) {
    try { w.close(); } catch {}
  }
  process.exit(0);
});
