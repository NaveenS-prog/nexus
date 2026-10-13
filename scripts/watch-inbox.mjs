#!/usr/bin/env node
// ==============================================================================
// NEXUS Academic Inbox Watcher - Standalone Linux / Desktop Service
// ==============================================================================

import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";

// Parse CLI arguments
const args = process.argv.slice(2);
let customDir = null;
let serverUrl = "http://localhost:3000";
let scanOnce = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--dir" || args[i] === "-d" || args[i] === "--inbox") {
    customDir = args[i + 1];
    i++;
  } else if (args[i] === "--server" || args[i] === "-s") {
    serverUrl = args[i + 1];
    i++;
  } else if (args[i] === "--once") {
    scanOnce = true;
  }
}

const inboxDir = customDir
  ? path.resolve(customDir)
  : process.env.NEXUS_ACADEMIC_INBOX_DIR
  ? path.resolve(process.env.NEXUS_ACADEMIC_INBOX_DIR)
  : path.join(os.homedir(), "NEXUS Academic Inbox");

const IGNORED_EXTENSIONS = new Set([
  ".crdownload",
  ".part",
  ".tmp",
  ".swp",
  ".lock",
]);

const activeProcessing = new Set();
const processedHashes = new Set();
let watcher = null;

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
  if (lower.endsWith(".txt")) return "text/plain";
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
function inferFileDetails(filePath) {
  const resolved = path.resolve(filePath);
  const rel = path.relative(inboxDir, resolved);
  const parts = rel.split(path.sep);
  const baseName = path.basename(resolved);
  const ext = path.extname(resolved);
  const titleRaw = path.basename(resolved, ext);

  let courseName = "";
  let courseCode = null;
  let missingFields = [];

  // Check directory path
  if (parts.length > 1) {
    const parentDir = parts[parts.length - 2].trim();
    const codeMatch = parentDir.match(/\b([A-Z]{2,5}\s?[-_ ]?\s?[0-9]{2,4}[A-Z]?)\b/i);
    if (codeMatch) {
      courseCode = codeMatch[1].replace(/[-_ ]/g, "").toUpperCase();
      courseName = parentDir;
    } else if (parentDir.length >= 3 && !["inbox", "files", "materials", "assignments"].includes(parentDir.toLowerCase())) {
      courseName = parentDir;
    }
  }

  // Check filename for course code if still empty
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
async function processFile(filePath) {
  if (activeProcessing.has(filePath)) return;

  try {
    activeProcessing.add(filePath);
    const fileName = path.basename(filePath);

    if (fileName.startsWith(".") || fileName.startsWith("~$") || IGNORED_EXTENSIONS.has(path.extname(filePath).toLowerCase())) {
      return;
    }

    log(`File detected: ${path.relative(inboxDir, filePath)}`, C.cyan);

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

    const details = inferFileDetails(filePath);
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
        ingestedVia: "linux_folder_watcher",
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
          log(`[CONFIRMATION REQUIRED] Ingested "${details.title}" with missing course metadata. Please review in NEXUS.`, C.yellow);
        } else {
          log(`[SUCCESS] Ingested "${details.title}" into course "${details.courseName}" (Type: ${json.item?.type || "ACADEMIC"}).`, C.green);
        }
      }
    } catch {
      // Server not running, use local storage fallback
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

      // Check if hash already exists in local store
      const exists = (store.items || []).some((i) => i.sourceExternalId === `hash:${hash}`);
      if (exists) {
        processedHashes.add(hash);
        log(`File content already present in local store: ${fileName}`, C.dim);
        return;
      }

      const itemId = crypto.randomUUID();
      const courseId = crypto.randomUUID();

      // Find or create course
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
        type: "ASSIGNMENT",
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
        log(`[OFFLINE SAVED] "${details.title}" saved to local store in "${targetCourse.name}".`, C.green);
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
async function scanDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith(".")) {
      await scanDirectory(full);
    } else if (entry.isFile()) {
      await processFile(full);
    }
  }
}

// Ensure Inbox Folder Exists
if (!fs.existsSync(inboxDir)) {
  fs.mkdirSync(inboxDir, { recursive: true });
  log(`Created academic inbox directory: ${inboxDir}`, C.green);
}

console.log(`${C.bold}${C.green}======================================================${C.reset}`);
console.log(`${C.bold} NEXUS Academic Inbox Watcher (Linux Desktop Edition)${C.reset}`);
console.log(`${C.bold}${C.green}======================================================${C.reset}`);
console.log(`Watched Directory : ${C.cyan}${inboxDir}${C.reset}`);
console.log(`Ingestion Target  : ${C.cyan}${serverUrl}/api/academic/ingest${C.reset}`);
console.log(`Deduplication     : ${C.cyan}SHA-256 Content Hash Verification${C.reset}`);
console.log(`Status            : ${C.green}Active & Waiting for Real Academic Files${C.reset}\n`);

// Initial scan
log("Running initial scan for existing files...", C.dim);
await scanDirectory(inboxDir);

if (scanOnce) {
  log("Single scan (--once) finished. Exiting.", C.green);
  process.exit(0);
}

log("Folder watcher is actively monitoring. (Press Ctrl+C to stop)\n", C.cyan);

// Start native recursive watcher
try {
  watcher = fs.watch(inboxDir, { recursive: true }, (eventType, filename) => {
    if (!filename) return;
    const fullPath = path.join(inboxDir, filename);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      processFile(fullPath);
    }
  });
} catch (e) {
  log(`Fallback to polling watcher: ${e.message}`, C.yellow);
}

// Graceful shutdown
process.on("SIGINT", () => {
  console.log(`\n${C.yellow}Shutting down NEXUS Academic Watcher...${C.reset}`);
  if (watcher) watcher.close();
  process.exit(0);
});

process.on("SIGTERM", () => {
  if (watcher) watcher.close();
  process.exit(0);
});
