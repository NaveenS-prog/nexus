// ==============================================================================
// NEXUS Academic Intelligence Layer - Linux/Desktop Folder Watcher Service
// ==============================================================================

import fs from "fs";
import path from "path";
import os from "os";
import { ingestLocalFile, FileIngestResult } from "./fileIngestion";
import { getWatchSources } from "./sourceManager";

export interface FolderWatcherConfig {
  inboxDir?: string;
  watchDirs?: string[];
  autoOrganizeDrive?: boolean;
  stabilityCheckIntervalMs?: number;
  maxStabilityWaitMs?: number;
  onFileIngested?: (result: FileIngestResult) => void;
  onError?: (err: Error, filePath?: string) => void;
  onLog?: (message: string) => void;
}

export interface FolderWatcherStatus {
  isWatching: boolean;
  inboxDir: string;
  watchDirs: string[];
  processedCount: number;
  lastProcessedAt?: string;
  activeProcessingFiles: string[];
}

const IGNORED_EXTENSIONS = new Set([
  ".crdownload",
  ".part",
  ".tmp",
  ".swp",
  ".lock",
]);

export function getDefaultAcademicInboxDir(): string {
  if (process.env.NEXUS_ACADEMIC_INBOX_DIR) {
    return path.resolve(process.env.NEXUS_ACADEMIC_INBOX_DIR);
  }
  return path.join(os.homedir(), "NEXUS Academic Inbox");
}

class AcademicFolderWatcher {
  private inboxDir: string;
  private isWatching: boolean = false;
  private processedCount: number = 0;
  private lastProcessedAt?: string;
  private activeProcessing = new Set<string>();
  private knownFiles = new Set<string>();
  private watchDirs: string[];
  private fsWatchers: fs.FSWatcher[] = [];
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private config: FolderWatcherConfig;

  constructor(config?: FolderWatcherConfig) {
    this.config = config || {};
    this.inboxDir = this.config.inboxDir || getDefaultAcademicInboxDir();

    if (this.config.watchDirs && this.config.watchDirs.length > 0) {
      this.watchDirs = this.config.watchDirs.map((d) => path.resolve(d));
    } else {
      const sources = getWatchSources().filter((s) => s.enabled);
      this.watchDirs = sources.map((s) => path.resolve(s.path));
      const resolvedInbox = path.resolve(this.inboxDir);
      if (!this.watchDirs.includes(resolvedInbox)) {
        this.watchDirs.push(resolvedInbox);
      }
    }
  }

  public getStatus(): FolderWatcherStatus {
    return {
      isWatching: this.isWatching,
      inboxDir: this.inboxDir,
      watchDirs: this.watchDirs,
      processedCount: this.processedCount,
      lastProcessedAt: this.lastProcessedAt,
      activeProcessingFiles: Array.from(this.activeProcessing),
    };
  }

  private getRootDirForFile(filePath: string): string {
    const resolved = path.resolve(filePath).toLowerCase();
    for (const d of this.watchDirs) {
      if (resolved.startsWith(d.toLowerCase())) {
        return d;
      }
    }
    return this.inboxDir;
  }

  /**
   * Ensures the inbox directory exists
   */
  public ensureDirectory(): string {
    if (!fs.existsSync(this.inboxDir)) {
      fs.mkdirSync(this.inboxDir, { recursive: true });
      this.log(`Created academic inbox folder: ${this.inboxDir}`);
    }
    return this.inboxDir;
  }

  private log(msg: string) {
    const formatted = `[NEXUS Folder Watcher] ${msg}`;
    if (this.config.onLog) {
      this.config.onLog(formatted);
    } else {
      console.log(formatted);
    }
  }

  private isIgnored(filePath: string): boolean {
    const base = path.basename(filePath);
    if (base.startsWith(".") || base.startsWith("~$")) return true;

    const ext = path.extname(filePath).toLowerCase();
    if (IGNORED_EXTENSIONS.has(ext)) return true;

    return false;
  }

  /**
   * Waits for file write/download stability before ingesting
   */
  private async waitForFileStability(filePath: string): Promise<boolean> {
    const interval = this.config.stabilityCheckIntervalMs || 600;
    const maxWait = this.config.maxStabilityWaitMs || 30000;
    const startTime = Date.now();

    let lastSize = -1;
    let consecutiveSame = 0;

    while (Date.now() - startTime < maxWait) {
      if (!fs.existsSync(filePath)) {
        return false;
      }

      try {
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
          return false;
        }

        const currentSize = stats.size;

        if (currentSize > 0 && currentSize === lastSize) {
          consecutiveSame++;
          if (consecutiveSame >= 2) {
            // File size remained steady across consecutive checks
            // Test if file can be opened for reading
            try {
              const fd = fs.openSync(filePath, "r");
              fs.closeSync(fd);
              return true;
            } catch {
              // Still locked by writing process
            }
          }
        } else {
          lastSize = currentSize;
          consecutiveSame = 0;
        }
      } catch {
        // Temporary stat error
      }

      await new Promise((res) => setTimeout(res, interval));
    }

    return false;
  }

  /**
   * Recursively scans and processes existing files
   */
  private async scanExistingFiles(dir: string) {
    if (!fs.existsSync(dir)) return;

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (!entry.name.startsWith(".")) {
            await this.scanExistingFiles(fullPath);
          }
        } else if (entry.isFile()) {
          if (!this.isIgnored(fullPath)) {
            await this.queueFileProcessing(fullPath);
          }
        }
      }
    } catch (err: any) {
      this.log(`Error scanning directory ${dir}: ${err.message}`);
    }
  }

  /**
   * Debounces and initiates file processing
   */
  private async queueFileProcessing(filePath: string) {
    if (this.isIgnored(filePath)) return;
    if (this.activeProcessing.has(filePath)) return;

    // Clear existing debounce timer
    const existingTimer = this.debounceTimers.get(filePath);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(async () => {
      this.debounceTimers.delete(filePath);
      await this.processFile(filePath);
    }, 500);

    this.debounceTimers.set(filePath, timer);
  }

  /**
   * Processes a single real file
   */
  public async processFile(filePath: string): Promise<FileIngestResult | null> {
    if (this.activeProcessing.has(filePath)) return null;

    try {
      this.activeProcessing.add(filePath);
      const rootDir = this.getRootDirForFile(filePath);
      this.log(`Analyzing file: ${path.relative(rootDir, filePath)}`);

      // 1. Wait until file write has completed
      const isStable = await this.waitForFileStability(filePath);
      if (!isStable) {
        this.log(`File not stable or deleted before ingestion: ${path.basename(filePath)}`);
        return null;
      }

      // 2. Ingest file into NEXUS pipeline
      const result = await ingestLocalFile(filePath, {
        inboxRootDir: rootDir,
        autoOrganizeDrive: this.config.autoOrganizeDrive,
      });

      this.processedCount++;
      this.lastProcessedAt = new Date().toISOString();
      this.knownFiles.add(filePath);

      this.log(result.message);

      if (this.config.onFileIngested) {
        this.config.onFileIngested(result);
      }

      return result;
    } catch (err: any) {
      this.log(`Failed to process ${path.basename(filePath)}: ${err.message}`);
      if (this.config.onError) {
        this.config.onError(err, filePath);
      }
      return null;
    } finally {
      this.activeProcessing.delete(filePath);
    }
  }

  /**
   * Starts watching the configured folders
   */
  public async start(): Promise<void> {
    if (this.isWatching) {
      this.log(`Watcher is already active.`);
      return;
    }

    this.isWatching = true;
    this.log(`Starting watcher across ${this.watchDirs.length} directories`);

    for (const dir of this.watchDirs) {
      if (!fs.existsSync(dir)) {
        try {
          fs.mkdirSync(dir, { recursive: true });
        } catch {}
      }
      this.log(`Monitoring directory: ${dir}`);
      await this.scanExistingFiles(dir);

      try {
        const watcher = fs.watch(
          dir,
          { recursive: true },
          (eventType, filename) => {
            if (!filename) return;
            const fullPath = path.join(dir, filename);
            this.queueFileProcessing(fullPath);
          }
        );

        watcher.on("error", (err) => {
          this.log(`Watcher error on ${dir}: ${err.message}`);
        });

        this.fsWatchers.push(watcher);
      } catch (err: any) {
        this.log(`Recursive watch fallback for ${dir}: ${err.message}`);
        this.setupFallbackDirectoryWatchers(dir);
      }
    }

    this.log(`Watchers active across ${this.watchDirs.length} directories.`);
  }

  private setupFallbackDirectoryWatchers(dir: string) {
    try {
      const watcher = fs.watch(dir, (eventType, filename) => {
        if (!filename) return;
        const fullPath = path.join(dir, filename);
        if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
          this.setupFallbackDirectoryWatchers(fullPath);
        } else {
          this.queueFileProcessing(fullPath);
        }
      });
      this.fsWatchers.push(watcher);

      // Also watch existing subfolders
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith(".")) {
          this.setupFallbackDirectoryWatchers(path.join(dir, entry.name));
        }
      }
    } catch {}
  }

  /**
   * Stops the watcher and releases file system handles
   */
  public stop() {
    this.isWatching = false;
    for (const w of this.fsWatchers) {
      try {
        w.close();
      } catch {}
    }
    this.fsWatchers = [];

    this.debounceTimers.forEach((timer) => {
      clearTimeout(timer);
    });
    this.debounceTimers.clear();
    this.log(`Watcher stopped.`);
  }
}

// Global singleton instance for in-process application access
let globalWatcherInstance: AcademicFolderWatcher | null = null;

export function getAcademicFolderWatcher(config?: FolderWatcherConfig): AcademicFolderWatcher {
  if (!globalWatcherInstance) {
    globalWatcherInstance = new AcademicFolderWatcher(config);
  }
  return globalWatcherInstance;
}
