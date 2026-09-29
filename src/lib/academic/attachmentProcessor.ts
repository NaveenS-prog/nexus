// ==============================================================================
// NEXUS Academic Intelligence Layer - Attachment Ingestion & Processing
// ==============================================================================

import crypto from "crypto";
import { getValidGoogleAccessToken } from "@/lib/integrations/googleApi";
import { updateAttachment } from "./storage";
import { AcademicAttachment } from "@/lib/types/academic";

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB safety limit

export const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/markdown",
  "text/csv",
  "text/x-python",
  "text/x-java-source",
  "text/x-c",
  "application/json",
  "image/png",
  "image/jpeg",
  "application/zip",
]);

export function isAllowedMimeType(mimeType: string): boolean {
  if (!mimeType) return true;
  return ALLOWED_MIME_TYPES.has(mimeType) || mimeType.startsWith("text/");
}

export function computeContentHash(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export function extractTextFromContent(buffer: Buffer, mimeType: string): string {
  // If plain text or source code, decode utf-8
  if (mimeType.startsWith("text/") || mimeType === "application/json" || mimeType === "text/csv") {
    return buffer.toString("utf-8");
  }

  // Basic extraction for text streams in binary files
  try {
    const raw = buffer.toString("utf-8");
    // Filter non-printable ASCII noise to extract readable text
    const printable = raw.replace(/[^\x20-\x7E\t\n\r]/g, " ");
    const lines = printable
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 20); // only keep substantive text strings
    return lines.slice(0, 100).join("\n");
  } catch {
    return "";
  }
}

/**
 * Downloads attachment from Google Drive or source URL, computes hash, and extracts text
 */
export async function processAcademicAttachment(
  attachment: AcademicAttachment,
  accountId?: string
): Promise<{ success: boolean; extractedText?: string; contentHash?: string; error?: string }> {
  try {
    await updateAttachment(attachment.id, {
      downloadStatus: "DOWNLOADING",
      processingStatus: "PROCESSING",
    });

    let buffer: Buffer | null = null;

    // 1. Google Drive File
    if (attachment.driveFileId) {
      const tokenResult = await getValidGoogleAccessToken(accountId);
      if (!tokenResult.token) {
        throw new Error("Google Drive access token unavailable.");
      }

      const driveDownloadUrl = `https://www.googleapis.com/drive/v3/files/${attachment.driveFileId}?alt=media`;
      const res = await fetch(driveDownloadUrl, {
        headers: { Authorization: `Bearer ${tokenResult.token}` },
      });

      if (!res.ok) {
        throw new Error(`Failed to download from Google Drive (HTTP ${res.status})`);
      }

      buffer = Buffer.from(await res.arrayBuffer());
    } else if (attachment.sourceUrl) {
      // 2. Direct Source URL
      const res = await fetch(attachment.sourceUrl);
      if (!res.ok) {
        throw new Error(`Failed to fetch attachment from URL (HTTP ${res.status})`);
      }

      buffer = Buffer.from(await res.arrayBuffer());
    }

    if (!buffer) {
      throw new Error("No accessible source URL or Google Drive file ID available for download.");
    }

    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      throw new Error(`Attachment exceeds maximum allowable file size (50MB).`);
    }

    const contentHash = computeContentHash(buffer);
    const extractedText = extractTextFromContent(buffer, attachment.mimeType);

    await updateAttachment(attachment.id, {
      size: buffer.length,
      contentHash,
      downloadStatus: "DOWNLOADED",
      processingStatus: "PROCESSED",
      extractedText: extractedText || undefined,
    });

    return {
      success: true,
      extractedText,
      contentHash,
    };
  } catch (err: any) {
    console.error(`[AttachmentProcessor] Failed for ${attachment.name}:`, err);
    await updateAttachment(attachment.id, {
      downloadStatus: "FAILED",
      processingStatus: "FAILED",
      metadata: { ...attachment.metadata, error: err.message },
    });

    return {
      success: false,
      error: err.message,
    };
  }
}
