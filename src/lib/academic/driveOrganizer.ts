// ==============================================================================
// NEXUS Academic Intelligence Layer - Google Drive Organizer Engine
// ==============================================================================

import { getValidGoogleAccessToken } from "@/lib/integrations/googleApi";
import { getStoredCredentials, getConnectedGoogleAccounts } from "@/lib/integrations/config";
import { getAcademicItemById, updateCourseDriveFolder, updateAttachment, updateAcademicItemStatus } from "./storage";

export interface DriveFolderHierarchy {
  rootFolderId: string;
  courseFolderId: string;
  subfolders: {
    lecturesId: string;
    assignmentsId: string;
    referenceId: string;
  };
}

/**
 * Searches for or creates a folder in Google Drive
 */
export async function getOrCreateDriveFolder(
  folderName: string,
  parentFolderId?: string,
  accountId?: string
): Promise<string> {
  const tokenResult = await getValidGoogleAccessToken(accountId);
  if (!tokenResult.token) {
    throw new Error("Google Drive access token unavailable. Please connect Google Drive in Settings.");
  }

  const queryParts = [
    `mimeType = 'application/vnd.google-apps.folder'`,
    `name = '${folderName.replace(/'/g, "\\'")}'`,
    `trashed = false`,
  ];
  if (parentFolderId) {
    queryParts.push(`'${parentFolderId}' in parents`);
  }

  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    queryParts.join(" and ")
  )}&fields=files(id, name)&spaces=drive`;

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${tokenResult.token}` },
  });

  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
  }

  // Create folder if not found
  const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenResult.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: parentFolderId ? [parentFolderId] : [],
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create Google Drive folder "${folderName}": ${errText}`);
  }

  const newFolder = await createRes.json();
  return newFolder.id;
}

/**
 * Ensures complete course folder structure exists in Google Drive:
 * NEXUS Academic / [Course Name] / (Lectures | Assignments | Reference Materials)
 */
export async function ensureCourseDriveHierarchy(
  courseName: string,
  accountId?: string
): Promise<DriveFolderHierarchy> {
  // 1. Root Folder
  const rootFolderId = await getOrCreateDriveFolder("NEXUS Academic", undefined, accountId);

  // 2. Course Folder
  const courseFolderId = await getOrCreateDriveFolder(courseName, rootFolderId, accountId);

  // 3. Category Subfolders
  const lecturesId = await getOrCreateDriveFolder("Lectures", courseFolderId, accountId);
  const assignmentsId = await getOrCreateDriveFolder("Assignments", courseFolderId, accountId);
  const referenceId = await getOrCreateDriveFolder("Reference Materials", courseFolderId, accountId);

  return {
    rootFolderId,
    courseFolderId,
    subfolders: {
      lecturesId,
      assignmentsId,
      referenceId,
    },
  };
}

/**
 * Uploads a file buffer or stream to a Google Drive folder
 */
export async function uploadFileToDrive(params: {
  fileName: string;
  mimeType: string;
  folderId: string;
  content: Buffer | Uint8Array | string;
  accountId?: string;
}): Promise<{ fileId: string; webViewLink?: string }> {
  const tokenResult = await getValidGoogleAccessToken(params.accountId);
  if (!tokenResult.token) {
    throw new Error("Google Drive access token unavailable.");
  }

  // Check if file already exists in folder (Deduplication)
  const query = `name = '${params.fileName.replace(/'/g, "\\'")}' and '${params.folderId}' in parents and trashed = false`;
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id, webViewLink)`;

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${tokenResult.token}` },
  });

  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      return {
        fileId: searchData.files[0].id,
        webViewLink: searchData.files[0].webViewLink,
      };
    }
  }

  // Multipart upload
  const metadata = {
    name: params.fileName,
    parents: [params.folderId],
  };

  const boundary = "-------314159265358979323846";
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const bodyBuffer = Buffer.isBuffer(params.content)
    ? params.content
    : Buffer.from(params.content);

  const multipartBody = Buffer.concat([
    Buffer.from(
      `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`
    ),
    Buffer.from(
      `${delimiter}Content-Type: ${params.mimeType}\r\n\r\n`
    ),
    bodyBuffer,
    Buffer.from(closeDelimiter),
  ]);

  const uploadRes = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenResult.token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    }
  );

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Failed to upload "${params.fileName}" to Google Drive: ${errText}`);
  }

  const uploadData = await uploadRes.json();
  return {
    fileId: uploadData.id,
    webViewLink: uploadData.webViewLink,
  };
}

/**
 * Organizes an academic item and its attachments into Google Drive course folders
 */
export async function organizeAcademicItemToDrive(
  itemId: string,
  preferredAccountId?: string
): Promise<{ success: boolean; courseFolderId?: string; organizedFilesCount: number; message: string }> {
  const item = await getAcademicItemById(itemId);
  if (!item) {
    throw new Error("Academic item not found.");
  }

  // Resolve account with Google Drive permission
  const creds = getStoredCredentials();
  const accounts = getConnectedGoogleAccounts(creds);

  let targetAccount = preferredAccountId
    ? accounts.find((a) => a.id === preferredAccountId)
    : accounts.find((a) => a.services?.includes("drive")) || accounts[0];

  if (!targetAccount) {
    return {
      success: false,
      organizedFilesCount: 0,
      message: "Connect Google Drive to organize your course materials.",
    };
  }

  // 1. Ensure folder structure
  const hierarchy = await ensureCourseDriveHierarchy(item.courseName, targetAccount.id);

  if (item.courseId) {
    await updateCourseDriveFolder(item.courseId, hierarchy.courseFolderId);
  }

  // 2. Select target folder based on item type
  let targetFolderId = hierarchy.subfolders.lecturesId;
  if (item.type === "ASSIGNMENT" || item.type === "PROJECT" || item.type === "LAB") {
    targetFolderId = hierarchy.subfolders.assignmentsId;
  } else if (item.type === "REFERENCE_MATERIAL") {
    targetFolderId = hierarchy.subfolders.referenceId;
  }

  let organizedFilesCount = 0;

  // 3. For each attachment, if downloadable, upload or link
  if (item.attachments && item.attachments.length > 0) {
    for (const att of item.attachments) {
      try {
        if (att.sourceUrl && !att.driveFileId) {
          // Download and re-upload if accessible public/signed URL
          const fileRes = await fetch(att.sourceUrl);
          if (fileRes.ok) {
            const buffer = Buffer.from(await fileRes.arrayBuffer());
            const upload = await uploadFileToDrive({
              fileName: att.name,
              mimeType: att.mimeType,
              folderId: targetFolderId,
              content: buffer,
              accountId: targetAccount.id,
            });

            await updateAttachment(att.id, {
              driveFileId: upload.fileId,
              driveFolderId: targetFolderId,
              downloadStatus: "DOWNLOADED",
              processingStatus: "PROCESSED",
            });
            organizedFilesCount++;
          }
        } else if (att.driveFileId) {
          // Drive file already exists: associate with target course folder
          await updateAttachment(att.id, {
            driveFolderId: targetFolderId,
            downloadStatus: "DOWNLOADED",
            processingStatus: "PROCESSED",
          });
          organizedFilesCount++;
        }
      } catch (attErr) {
        console.warn(`Failed to organize attachment ${att.name}:`, attErr);
      }
    }
  }

  // 4. Update item status
  await updateAcademicItemStatus(itemId, "ORGANIZED", {
    driveFolderId: targetFolderId,
    courseDriveFolderId: hierarchy.courseFolderId,
    organizedAt: new Date().toISOString(),
  });

  return {
    success: true,
    courseFolderId: hierarchy.courseFolderId,
    organizedFilesCount,
    message: `Organized into "${item.courseName}" in Google Drive (${organizedFilesCount} files).`,
  };
}
