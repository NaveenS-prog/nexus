// ==============================================================================
// NEXUS Academic Intelligence Layer - Dynamic Watch Source Manager
// ==============================================================================

import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { ingestLocalFile, FileIngestResult } from "./fileIngestion";

export interface WatchSource {
  id: string;
  path: string;
  label: string;
  enabled: boolean;
  addedAt: string;
  lastScannedAt?: string;
  itemCount?: number;
}

export interface ScanResult {
  success: boolean;
  sourcesScanned: number;
  totalFiles: number;
  itemsCreated: number;
  duplicatesSkipped: number;
  errors: Array<{ path: string; error: string }>;
  courses: string[];
}

const SUPPORTED_EXTENSIONS = new Set([
  ".pdf",
  ".docx",
  ".doc",
  ".pptx",
  ".ppt",
  ".xlsx",
  ".xls",
  ".txt",
  ".md",
  ".py",
  ".java",
  ".c",
  ".cpp",
  ".ipynb",
  ".jpeg",
  ".jpg",
  ".png",
  ".zip",
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

export function sanitizeFolderPath(rawPath: string): string {
  let clean = (rawPath || "").trim();
  // Strip outer quotes if copied as path on Windows (e.g. "D:\SEM 3")
  clean = clean.replace(/^["']+|["']+$/g, "").trim();

  // Expand ~ or ~/ or ~\ to user's home directory
  if (clean === "~") {
    clean = os.homedir();
  } else if (clean.startsWith("~/") || clean.startsWith("~\\")) {
    clean = path.join(os.homedir(), clean.slice(2));
  }

  // Normalize slashes for OS
  return path.normalize(path.resolve(clean));
}

function getSourcesConfigPath(): string {
  return path.join(process.cwd(), "academic_sources.json");
}

function getDefaultSources(): WatchSource[] {
  const sources: WatchSource[] = [];
  const now = new Date().toISOString();

  // 1. Check if D:\SEM 3 exists
  const sem3Path = process.platform === "win32" ? "D:\\SEM 3" : path.join(os.homedir(), "SEM 3");
  if (fs.existsSync(sem3Path)) {
    sources.push({
      id: "source-sem3",
      path: path.resolve(sem3Path),
      label: "SEM 3 (D: Drive)",
      enabled: true,
      addedAt: now,
      itemCount: 0,
    });
  }

  // 2. Default ~/NEXUS Academic Inbox
  const defaultInbox = process.env.NEXUS_ACADEMIC_INBOX_DIR
    ? path.resolve(process.env.NEXUS_ACADEMIC_INBOX_DIR)
    : path.join(os.homedir(), "NEXUS Academic Inbox");

  sources.push({
    id: "source-default-inbox",
    path: path.resolve(defaultInbox),
    label: "NEXUS Academic Inbox",
    enabled: true,
    addedAt: now,
    itemCount: 0,
  });

  // 3. Environment variable watch dirs (semicolon or comma separated)
  if (process.env.NEXUS_ACADEMIC_WATCH_DIRS) {
    const extraDirs = process.env.NEXUS_ACADEMIC_WATCH_DIRS.split(/[;,]/)
      .map((d) => d.trim())
      .filter((d) => d.length > 0);

    for (const d of extraDirs) {
      const resolved = sanitizeFolderPath(d);
      if (!sources.some((s) => s.path.toLowerCase() === resolved.toLowerCase())) {
        sources.push({
          id: `source-${crypto.randomBytes(4).toString("hex")}`,
          path: resolved,
          label: path.basename(resolved),
          enabled: true,
          addedAt: now,
          itemCount: 0,
        });
      }
    }
  }

  return sources;
}

export function getWatchSources(): WatchSource[] {
  const configPath = getSourcesConfigPath();
  try {
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed.sources)) {
        // Filter out sandbox paths on Windows if they do not exist
        const cleaned = parsed.sources.filter((s: WatchSource) => {
          if (process.platform === "win32" && s.path && s.path.startsWith("/home/")) {
            return false;
          }
          return true;
        });
        if (cleaned.length !== parsed.sources.length) {
          saveWatchSources(cleaned);
        }
        return cleaned;
      }
    }
  } catch (err) {
    console.error("[SourceManager] Error reading academic sources config:", err);
  }

  const defaults = getDefaultSources();
  saveWatchSources(defaults);
  return defaults;
}

export function saveWatchSources(sources: WatchSource[]): void {
  const configPath = getSourcesConfigPath();
  try {
    fs.writeFileSync(configPath, JSON.stringify({ sources }, null, 2), "utf-8");
  } catch (err) {
    console.error("[SourceManager] Error saving academic sources config:", err);
  }
}

export function addWatchSource(folderPath: string, label?: string): WatchSource {
  const resolved = sanitizeFolderPath(folderPath);
  const sources = getWatchSources();

  const existing = sources.find((s) => s.path.toLowerCase() === resolved.toLowerCase());
  if (existing) {
    existing.enabled = true;
    if (label) existing.label = label;
    saveWatchSources(sources);
    return existing;
  }

  // Ensure folder exists on disk
  if (!fs.existsSync(resolved)) {
    try {
      fs.mkdirSync(resolved, { recursive: true });
    } catch (err: any) {
      throw new Error(`Folder path does not exist and could not be created: ${err.message}`);
    }
  }

  const newSource: WatchSource = {
    id: `source-${crypto.randomBytes(4).toString("hex")}`,
    path: resolved,
    label: label?.trim() || path.basename(resolved) || resolved,
    enabled: true,
    addedAt: new Date().toISOString(),
    itemCount: 0,
  };

  sources.push(newSource);
  saveWatchSources(sources);
  return newSource;
}

export function removeWatchSource(id: string): boolean {
  const sources = getWatchSources();
  const nextSources = sources.filter((s) => s.id !== id);
  if (nextSources.length === sources.length) return false;
  saveWatchSources(nextSources);
  return true;
}

export function toggleWatchSource(id: string, enabled: boolean): boolean {
  const sources = getWatchSources();
  const found = sources.find((s) => s.id === id);
  if (!found) return false;
  found.enabled = enabled;
  saveWatchSources(sources);
  return true;
}

/**
 * Scans a directory recursively and ingests valid academic files
 */
async function scanDirectoryRecursive(
  dir: string,
  rootInboxDir: string,
  userId: string,
  scanStats: {
    totalFiles: number;
    itemsCreated: number;
    duplicatesSkipped: number;
    coursesFound: Set<string>;
    errors: Array<{ path: string; error: string }>;
  }
): Promise<void> {
  if (!fs.existsSync(dir)) return;

  let entries: fs.Dirent[] = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err: any) {
    scanStats.errors.push({ path: dir, error: err.message });
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name.startsWith(".") || IGNORED_DIR_NAMES.has(entry.name.toLowerCase())) {
        continue;
      }
      await scanDirectoryRecursive(fullPath, rootInboxDir, userId, scanStats);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (!SUPPORTED_EXTENSIONS.has(ext)) {
        continue;
      }
      if (entry.name.startsWith(".") || entry.name.startsWith("~$")) {
        continue;
      }

      // Skip large generated dataset files (> 25 MB)
      try {
        const stat = fs.statSync(fullPath);
        if (stat.size > 25 * 1024 * 1024 || stat.size === 0) {
          continue;
        }
      } catch {
        continue;
      }

      scanStats.totalFiles++;

      try {
        const result: FileIngestResult = await ingestLocalFile(fullPath, {
          inboxRootDir: rootInboxDir,
          userId,
        });

        if (result.created) {
          scanStats.itemsCreated++;
        } else if (result.duplicate) {
          scanStats.duplicatesSkipped++;
        }

        if (result.item.courseName) {
          scanStats.coursesFound.add(result.item.courseName);
        }
      } catch (err: any) {
        scanStats.errors.push({ path: fullPath, error: err.message });
      }
    }
  }
}

/**
 * Executes a full scan across all enabled watch sources
 */
export async function scanAllWatchSources(options?: { userId?: string }): Promise<ScanResult> {
  const sources = getWatchSources().filter((s) => s.enabled);
  const userId = options?.userId || "user_default";

  const scanStats = {
    totalFiles: 0,
    itemsCreated: 0,
    duplicatesSkipped: 0,
    coursesFound: new Set<string>(),
    errors: [] as Array<{ path: string; error: string }>,
  };

  const allSources = getWatchSources();

  for (const source of sources) {
    if (!fs.existsSync(source.path)) {
      continue;
    }

    const startFiles = scanStats.totalFiles;
    await scanDirectoryRecursive(source.path, source.path, userId, scanStats);
    const filesInSource = scanStats.totalFiles - startFiles;

    // Update source stats
    const match = allSources.find((s) => s.id === source.id);
    if (match) {
      match.lastScannedAt = new Date().toISOString();
      match.itemCount = filesInSource;
    }
  }

  saveWatchSources(allSources);

  return {
    success: true,
    sourcesScanned: sources.length,
    totalFiles: scanStats.totalFiles,
    itemsCreated: scanStats.itemsCreated,
    duplicatesSkipped: scanStats.duplicatesSkipped,
    errors: scanStats.errors,
    courses: Array.from(scanStats.coursesFound),
  };
}
