import fs from "fs";
import path from "path";
import crypto from "crypto";
const uuidv4 = () => crypto.randomUUID();
import { createClient } from "@/lib/supabase/client";
import {
  AcademicCourse,
  AcademicItem,
  AcademicAttachment,
  AcademicRequirement,
  AcademicWorkspace,
  ExtensionPairing,
  AcademicItemStatus,
  DeliverableType,
  RequirementStatus,
  AcademicSource,
} from "@/lib/types/academic";

interface LocalAcademicDatabase {
  courses: AcademicCourse[];
  items: AcademicItem[];
  attachments: AcademicAttachment[];
  requirements: AcademicRequirement[];
  workspaces: AcademicWorkspace[];
  pairings: ExtensionPairing[];
}

function getLocalStorePath(): string {
  return path.join(process.cwd(), "academic_store.json");
}

function readLocalDatabase(): LocalAcademicDatabase {
  const defaultDb: LocalAcademicDatabase = {
    courses: [],
    items: [],
    attachments: [],
    requirements: [],
    workspaces: [],
    pairings: [],
  };

  try {
    const filePath = getLocalStorePath();
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(data);
      return {
        courses: Array.isArray(parsed.courses) ? parsed.courses : [],
        items: Array.isArray(parsed.items) ? parsed.items : [],
        attachments: Array.isArray(parsed.attachments) ? parsed.attachments : [],
        requirements: Array.isArray(parsed.requirements) ? parsed.requirements : [],
        workspaces: Array.isArray(parsed.workspaces) ? parsed.workspaces : [],
        pairings: Array.isArray(parsed.pairings) ? parsed.pairings : [],
      };
    }
  } catch (err) {
    console.error("[AcademicStorage] Error reading local academic database:", err);
  }

  return defaultDb;
}

function writeLocalDatabase(db: LocalAcademicDatabase) {
  try {
    const filePath = getLocalStorePath();
    fs.writeFileSync(filePath, JSON.stringify(db, null, 2), "utf-8");
  } catch (err) {
    console.error("[AcademicStorage] Error writing local academic database:", err);
  }
}

// =============================================================================
// Course Storage
// =============================================================================

export async function getAcademicCourses(userId?: string): Promise<AcademicCourse[]> {
  const supabase = createClient();
  if (supabase) {
    try {
      let query = supabase.from("academic_courses").select("*").order("name");
      if (userId) query = query.eq("user_id", userId);
      const { data, error } = await query;
      if (!error && data) {
        return data.map((c: any) => ({
          id: c.id,
          userId: c.user_id,
          externalCourseId: c.external_course_id,
          source: c.source,
          connectedAccountId: c.connected_account_id,
          name: c.name,
          courseCode: c.course_code,
          section: c.section,
          teacherName: c.teacher_name,
          driveFolderId: c.drive_folder_id,
          active: c.active,
          createdAt: c.created_at,
          updatedAt: c.updated_at,
        }));
      }
    } catch {}
  }

  const db = readLocalDatabase();
  return db.courses.filter((c) => !userId || c.userId === userId || !c.userId);
}

export async function findOrCreateCourse(params: {
  name: string;
  courseCode?: string;
  section?: string;
  teacherName?: string;
  connectedAccountId?: string;
  source?: AcademicSource;
  userId?: string;
  externalCourseId?: string;
}): Promise<AcademicCourse> {
  const normName = params.name.trim();
  const normCode = params.courseCode?.trim().toUpperCase();

  const courses = await getAcademicCourses(params.userId);
  const existing = courses.find((c) => {
    if (params.externalCourseId && c.externalCourseId === params.externalCourseId) return true;
    if (normCode && c.courseCode && c.courseCode.toUpperCase() === normCode) return true;
    return c.name.toLowerCase() === normName.toLowerCase();
  });

  if (existing) {
    return existing;
  }

  const newCourse: AcademicCourse = {
    id: uuidv4(),
    userId: params.userId,
    externalCourseId: params.externalCourseId,
    source: params.source || "CLASSROOM_BROWSER",
    connectedAccountId: params.connectedAccountId,
    name: normName,
    courseCode: normCode,
    section: params.section?.trim(),
    teacherName: params.teacherName?.trim(),
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const supabase = createClient();
  if (supabase) {
    try {
      await supabase.from("academic_courses").insert({
        id: newCourse.id,
        user_id: newCourse.userId,
        external_course_id: newCourse.externalCourseId,
        source: newCourse.source,
        connected_account_id: newCourse.connectedAccountId,
        name: newCourse.name,
        course_code: newCourse.courseCode,
        section: newCourse.section,
        teacher_name: newCourse.teacherName,
        active: newCourse.active,
      });
    } catch {}
  }

  const db = readLocalDatabase();
  db.courses.push(newCourse);
  writeLocalDatabase(db);

  return newCourse;
}

export async function updateCourseDriveFolder(courseId: string, driveFolderId: string): Promise<void> {
  const supabase = createClient();
  if (supabase) {
    try {
      await supabase
        .from("academic_courses")
        .update({ drive_folder_id: driveFolderId, updated_at: new Date().toISOString() })
        .eq("id", courseId);
    } catch {}
  }

  const db = readLocalDatabase();
  const course = db.courses.find((c) => c.id === courseId);
  if (course) {
    course.driveFolderId = driveFolderId;
    course.updatedAt = new Date().toISOString();
    writeLocalDatabase(db);
  }
}

// =============================================================================
// Academic Item Storage
// =============================================================================

export async function getAcademicItems(filters?: {
  type?: string;
  courseId?: string;
  status?: string;
  search?: string;
  userId?: string;
}): Promise<AcademicItem[]> {
  const supabase = createClient();
  if (supabase) {
    try {
      let query = supabase.from("academic_items").select(`
        *,
        academic_attachments (*),
        academic_requirements (*),
        academic_workspaces (*)
      `).order("created_at", { ascending: false });

      if (filters?.userId) query = query.eq("user_id", filters.userId);
      if (filters?.type && filters.type !== "all") query = query.eq("type", filters.type);
      if (filters?.courseId) query = query.eq("course_id", filters.courseId);
      if (filters?.status && filters.status !== "all") query = query.eq("status", filters.status);

      const { data, error } = await query;
      if (!error && data) {
        return data.map((d: any) => ({
          id: d.id,
          userId: d.user_id,
          source: d.source,
          sourceAccountId: d.source_account_id,
          sourceExternalId: d.source_external_id,
          sourceUrl: d.source_url,
          type: d.type,
          courseId: d.course_id,
          courseName: d.course_name,
          courseCode: d.course_code,
          courseSection: d.course_section,
          title: d.title,
          description: d.description,
          instructions: d.instructions,
          publishedAt: d.published_at,
          dueAt: d.due_at,
          status: d.status,
          priority: d.priority,
          taskId: d.task_id,
          metadata: d.metadata || {},
          rawSourceData: d.raw_source_data || {},
          createdAt: d.created_at,
          updatedAt: d.updated_at,
          attachments: (d.academic_attachments || []).map((a: any) => ({
            id: a.id,
            userId: a.user_id,
            academicItemId: a.academic_item_id,
            source: a.source,
            sourceExternalId: a.source_external_id,
            name: a.name,
            originalName: a.original_name,
            mimeType: a.mime_type,
            size: a.size,
            sourceUrl: a.source_url,
            downloadStatus: a.download_status,
            storagePath: a.storage_path,
            contentHash: a.content_hash,
            driveFileId: a.drive_file_id,
            driveFolderId: a.drive_folder_id,
            processingStatus: a.processing_status,
            extractedText: a.extracted_text,
            metadata: a.metadata,
          })),
          requirements: (d.academic_requirements || []).map((r: any) => ({
            id: r.id,
            userId: r.user_id,
            academicItemId: r.academic_item_id,
            description: r.description,
            type: r.type,
            mandatory: r.mandatory,
            status: r.status,
            sourceReference: r.source_reference,
            evidence: r.evidence,
            orderIndex: r.order_index,
          })),
          workspace: d.academic_workspaces?.[0] ? {
            id: d.academic_workspaces[0].id,
            userId: d.academic_workspaces[0].user_id,
            academicItemId: d.academic_workspaces[0].academic_item_id,
            state: d.academic_workspaces[0].state,
            deliverableType: d.academic_workspaces[0].deliverable_type,
            activeVersion: d.academic_workspaces[0].active_version,
            generatedFiles: d.academic_workspaces[0].generated_files || [],
            reviewResults: d.academic_workspaces[0].review_results,
            userApproved: d.academic_workspaces[0].user_approved,
            approvedAt: d.academic_workspaces[0].approved_at,
            finalNotes: d.academic_workspaces[0].final_notes,
          } : undefined,
        }));
      }
    } catch {}
  }

  const db = readLocalDatabase();
  let list = db.items;

  if (filters?.userId) list = list.filter((i) => !i.userId || i.userId === filters.userId);
  if (filters?.type && filters.type !== "all") list = list.filter((i) => i.type === filters.type);
  if (filters?.courseId) list = list.filter((i) => i.courseId === filters.courseId);
  if (filters?.status && filters.status !== "all") list = list.filter((i) => i.status === filters.status);
  if (filters?.search) {
    const s = filters.search.toLowerCase();
    list = list.filter(
      (i) =>
        i.title.toLowerCase().includes(s) ||
        i.courseName.toLowerCase().includes(s) ||
        i.instructions?.toLowerCase().includes(s)
    );
  }

  // Populate attachments, requirements, and workspace
  return list.map((item) => ({
    ...item,
    attachments: db.attachments.filter((a) => a.academicItemId === item.id),
    requirements: db.requirements.filter((r) => r.academicItemId === item.id),
    workspace: db.workspaces.find((w) => w.academicItemId === item.id),
  }));
}

export async function getAcademicItemById(id: string): Promise<AcademicItem | null> {
  const items = await getAcademicItems();
  return items.find((i) => i.id === id) || null;
}

export async function findItemByExternalId(source: string, externalId: string): Promise<AcademicItem | null> {
  const items = await getAcademicItems();
  return items.find((i) => i.source === source && i.sourceExternalId === externalId) || null;
}

export async function saveAcademicItem(itemData: Partial<AcademicItem>): Promise<AcademicItem> {
  const id = itemData.id || uuidv4();
  const now = new Date().toISOString();

  const item: AcademicItem = {
    id,
    userId: itemData.userId,
    source: itemData.source || "CLASSROOM_BROWSER",
    sourceAccountId: itemData.sourceAccountId,
    sourceExternalId: itemData.sourceExternalId,
    sourceUrl: itemData.sourceUrl,
    type: itemData.type || "ASSIGNMENT",
    courseId: itemData.courseId,
    courseName: itemData.courseName || "General Academics",
    courseCode: itemData.courseCode,
    courseSection: itemData.courseSection,
    title: itemData.title || "Untitled Academic Item",
    description: itemData.description,
    instructions: itemData.instructions,
    publishedAt: itemData.publishedAt,
    dueAt: itemData.dueAt,
    status: itemData.status || "NEW",
    priority: itemData.priority || "medium",
    taskId: itemData.taskId,
    metadata: itemData.metadata || {},
    rawSourceData: itemData.rawSourceData || {},
    createdAt: itemData.createdAt || now,
    updatedAt: now,
  };

  const supabase = createClient();
  if (supabase) {
    try {
      await supabase.from("academic_items").upsert({
        id: item.id,
        user_id: item.userId,
        source: item.source,
        source_account_id: item.sourceAccountId,
        source_external_id: item.sourceExternalId,
        source_url: item.sourceUrl,
        type: item.type,
        course_id: item.courseId,
        course_name: item.courseName,
        course_code: item.courseCode,
        course_section: item.courseSection,
        title: item.title,
        description: item.description,
        instructions: item.instructions,
        published_at: item.publishedAt,
        due_at: item.dueAt,
        status: item.status,
        priority: item.priority,
        task_id: item.taskId,
        metadata: item.metadata,
        raw_source_data: item.rawSourceData,
        updated_at: now,
      });
    } catch {}
  }

  const db = readLocalDatabase();
  const idx = db.items.findIndex((i) => i.id === item.id);
  if (idx >= 0) {
    db.items[idx] = { ...db.items[idx], ...item };
  } else {
    db.items.unshift(item);
  }
  writeLocalDatabase(db);

  return item;
}

export async function updateAcademicItemStatus(
  id: string,
  status: AcademicItemStatus,
  extraMetadata?: Record<string, any>
): Promise<void> {
  const now = new Date().toISOString();
  const supabase = createClient();
  if (supabase) {
    try {
      await supabase
        .from("academic_items")
        .update({ status, updated_at: now, ...(extraMetadata ? { metadata: extraMetadata } : {}) })
        .eq("id", id);
    } catch {}
  }

  const db = readLocalDatabase();
  const item = db.items.find((i) => i.id === id);
  if (item) {
    item.status = status;
    item.updatedAt = now;
    if (extraMetadata) {
      item.metadata = { ...item.metadata, ...extraMetadata };
    }
    writeLocalDatabase(db);
  }
}

export async function deleteAcademicItem(id: string): Promise<boolean> {
  const supabase = createClient();
  if (supabase) {
    try {
      await supabase.from("academic_items").delete().eq("id", id);
    } catch {}
  }

  const db = readLocalDatabase();
  db.items = db.items.filter((i) => i.id !== id);
  db.attachments = db.attachments.filter((a) => a.academicItemId !== id);
  db.requirements = db.requirements.filter((r) => r.academicItemId !== id);
  db.workspaces = db.workspaces.filter((w) => w.academicItemId !== id);
  writeLocalDatabase(db);
  return true;
}

// =============================================================================
// Attachments Storage
// =============================================================================

export async function saveAttachment(attachmentData: Partial<AcademicAttachment>): Promise<AcademicAttachment> {
  const id = attachmentData.id || uuidv4();
  const now = new Date().toISOString();

  const attachment: AcademicAttachment = {
    id,
    userId: attachmentData.userId,
    academicItemId: attachmentData.academicItemId!,
    source: attachmentData.source || "CLASSROOM_BROWSER",
    sourceExternalId: attachmentData.sourceExternalId,
    name: attachmentData.name || "attachment",
    originalName: attachmentData.originalName || attachmentData.name || "attachment",
    mimeType: attachmentData.mimeType || "application/octet-stream",
    size: attachmentData.size || 0,
    sourceUrl: attachmentData.sourceUrl,
    downloadStatus: attachmentData.downloadStatus || "NOT_REQUESTED",
    storagePath: attachmentData.storagePath,
    contentHash: attachmentData.contentHash,
    driveFileId: attachmentData.driveFileId,
    driveFolderId: attachmentData.driveFolderId,
    processingStatus: attachmentData.processingStatus || "NOT_PROCESSED",
    extractedText: attachmentData.extractedText,
    metadata: attachmentData.metadata || {},
    createdAt: attachmentData.createdAt || now,
    updatedAt: now,
  };

  const supabase = createClient();
  if (supabase) {
    try {
      await supabase.from("academic_attachments").upsert({
        id: attachment.id,
        user_id: attachment.userId,
        academic_item_id: attachment.academicItemId,
        source: attachment.source,
        source_external_id: attachment.sourceExternalId,
        name: attachment.name,
        original_name: attachment.originalName,
        mime_type: attachment.mimeType,
        size: attachment.size,
        source_url: attachment.sourceUrl,
        download_status: attachment.downloadStatus,
        storage_path: attachment.storagePath,
        content_hash: attachment.contentHash,
        drive_file_id: attachment.driveFileId,
        drive_folder_id: attachment.driveFolderId,
        processing_status: attachment.processingStatus,
        extracted_text: attachment.extractedText,
        metadata: attachment.metadata,
        updated_at: now,
      });
    } catch {}
  }

  const db = readLocalDatabase();
  const idx = db.attachments.findIndex((a) => a.id === attachment.id);
  if (idx >= 0) {
    db.attachments[idx] = { ...db.attachments[idx], ...attachment };
  } else {
    db.attachments.push(attachment);
  }
  writeLocalDatabase(db);

  return attachment;
}

export async function updateAttachment(id: string, updates: Partial<AcademicAttachment>): Promise<void> {
  const now = new Date().toISOString();
  const db = readLocalDatabase();
  const att = db.attachments.find((a) => a.id === id);
  if (att) {
    Object.assign(att, updates, { updatedAt: now });
    writeLocalDatabase(db);
  }

  const supabase = createClient();
  if (supabase) {
    try {
      await supabase.from("academic_attachments").update({ ...updates, updated_at: now }).eq("id", id);
    } catch {}
  }
}

// =============================================================================
// Requirements Storage
// =============================================================================

export async function saveRequirement(reqData: Partial<AcademicRequirement>): Promise<AcademicRequirement> {
  const id = reqData.id || uuidv4();
  const now = new Date().toISOString();

  const req: AcademicRequirement = {
    id,
    userId: reqData.userId,
    academicItemId: reqData.academicItemId!,
    description: reqData.description || "",
    type: reqData.type || "DELIVERABLE",
    mandatory: reqData.mandatory ?? true,
    status: reqData.status || "NOT_STARTED",
    sourceReference: reqData.sourceReference,
    evidence: reqData.evidence,
    orderIndex: reqData.orderIndex || 0,
    createdAt: reqData.createdAt || now,
    updatedAt: now,
  };

  const supabase = createClient();
  if (supabase) {
    try {
      await supabase.from("academic_requirements").upsert({
        id: req.id,
        user_id: req.userId,
        academic_item_id: req.academicItemId,
        description: req.description,
        type: req.type,
        mandatory: req.mandatory,
        status: req.status,
        source_reference: req.sourceReference,
        evidence: req.evidence,
        order_index: req.orderIndex,
        updated_at: now,
      });
    } catch {}
  }

  const db = readLocalDatabase();
  const idx = db.requirements.findIndex((r) => r.id === req.id);
  if (idx >= 0) {
    db.requirements[idx] = { ...db.requirements[idx], ...req };
  } else {
    db.requirements.push(req);
  }
  writeLocalDatabase(db);

  return req;
}

export async function getItemRequirements(itemId: string): Promise<AcademicRequirement[]> {
  const supabase = createClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("academic_requirements")
        .select("*")
        .eq("academic_item_id", itemId)
        .order("order_index");
      if (!error && data) {
        return data.map((r: any) => ({
          id: r.id,
          userId: r.user_id,
          academicItemId: r.academic_item_id,
          description: r.description,
          type: r.type,
          mandatory: r.mandatory,
          status: r.status,
          sourceReference: r.source_reference,
          evidence: r.evidence,
          orderIndex: r.order_index,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }));
      }
    } catch {}
  }

  const db = readLocalDatabase();
  return db.requirements.filter((r) => r.academicItemId === itemId);
}

export async function updateRequirementStatus(
  id: string,
  status: RequirementStatus,
  evidence?: string
): Promise<void> {
  const now = new Date().toISOString();
  const db = readLocalDatabase();
  const req = db.requirements.find((r) => r.id === id);
  if (req) {
    req.status = status;
    if (evidence) req.evidence = evidence;
    req.updatedAt = now;
    writeLocalDatabase(db);
  }

  const supabase = createClient();
  if (supabase) {
    try {
      await supabase
        .from("academic_requirements")
        .update({
          status,
          evidence,
          updated_at: now,
        })
        .eq("id", id);
    } catch {}
  }
}

// =============================================================================
// Workspaces Storage
// =============================================================================

export async function getOrCreateWorkspace(
  itemId: string,
  deliverableType: DeliverableType = "MARKDOWN",
  userId?: string
): Promise<AcademicWorkspace> {
  const db = readLocalDatabase();
  const existing = db.workspaces.find((w) => w.academicItemId === itemId);
  if (existing) return existing;

  const newWorkspace: AcademicWorkspace = {
    id: uuidv4(),
    userId,
    academicItemId: itemId,
    state: "DETECTED",
    deliverableType,
    activeVersion: 1,
    generatedFiles: [],
    userApproved: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const supabase = createClient();
  if (supabase) {
    try {
      await supabase.from("academic_workspaces").insert({
        id: newWorkspace.id,
        user_id: newWorkspace.userId,
        academic_item_id: newWorkspace.academicItemId,
        state: newWorkspace.state,
        deliverable_type: newWorkspace.deliverableType,
        active_version: newWorkspace.activeVersion,
        generated_files: newWorkspace.generatedFiles,
        user_approved: newWorkspace.userApproved,
      });
    } catch {}
  }

  db.workspaces.push(newWorkspace);
  writeLocalDatabase(db);
  return newWorkspace;
}

export async function updateWorkspace(
  itemId: string,
  updates: Partial<AcademicWorkspace>
): Promise<AcademicWorkspace> {
  const now = new Date().toISOString();
  const db = readLocalDatabase();
  let ws = db.workspaces.find((w) => w.academicItemId === itemId);

  if (!ws) {
    ws = await getOrCreateWorkspace(itemId);
  }

  Object.assign(ws, updates, { updatedAt: now });
  writeLocalDatabase(db);

  const supabase = createClient();
  if (supabase) {
    try {
      await supabase.from("academic_workspaces").update({
        state: ws.state,
        deliverable_type: ws.deliverableType,
        active_version: ws.activeVersion,
        generated_files: ws.generatedFiles,
        review_results: ws.reviewResults,
        user_approved: ws.userApproved,
        approved_at: ws.approvedAt,
        final_notes: ws.finalNotes,
        updated_at: now,
      }).eq("academic_item_id", itemId);
    } catch {}
  }

  return ws;
}

// =============================================================================
// Extension Pairing Storage
// =============================================================================

export async function generatePairingCode(
  userId: string = "user_default",
  deviceName: string = "Chrome Browser Extension"
): Promise<{ pairingCode: string; authToken: string; expiresAt: string }> {
  // Generate user-friendly 6-digit uppercase code (e.g. "NX-849201")
  const num = Math.floor(100000 + Math.random() * 900000);
  const pairingCode = `NX-${num}`;
  const authToken = `nxtk_${uuidv4().replace(/-/g, "")}`;
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins for code pairing

  const pairing: ExtensionPairing = {
    id: uuidv4(),
    userId,
    pairingCode,
    authToken,
    deviceName,
    status: "PENDING",
    expiresAt,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const supabase = createClient();
  if (supabase) {
    try {
      await supabase.from("extension_pairings").insert({
        id: pairing.id,
        user_id: pairing.userId,
        pairing_code: pairing.pairingCode,
        auth_token: pairing.authToken,
        device_name: pairing.deviceName,
        status: pairing.status,
        expires_at: pairing.expiresAt,
      });
    } catch {}
  }

  const db = readLocalDatabase();
  db.pairings.push(pairing);
  writeLocalDatabase(db);

  return { pairingCode, authToken, expiresAt };
}

export async function pairWithCode(
  code: string,
  deviceName: string = "Chrome Browser Extension"
): Promise<{ success: boolean; token?: string; error?: string }> {
  const normCode = code.trim().toUpperCase();
  const db = readLocalDatabase();
  const pairing = db.pairings.find((p) => p.pairingCode === normCode);

  if (!pairing) {
    return { success: false, error: "Invalid pairing code. Please generate a new code in NEXUS." };
  }

  if (new Date(pairing.expiresAt) < new Date()) {
    return { success: false, error: "Pairing code has expired. Please generate a new code in NEXUS." };
  }

  pairing.status = "ACTIVE";
  pairing.deviceName = deviceName;
  pairing.lastUsedAt = new Date().toISOString();
  pairing.updatedAt = new Date().toISOString();
  writeLocalDatabase(db);

  const supabase = createClient();
  if (supabase) {
    try {
      await supabase.from("extension_pairings").update({
        status: "ACTIVE",
        device_name: deviceName,
        last_used_at: pairing.lastUsedAt,
        updated_at: pairing.updatedAt,
      }).eq("id", pairing.id);
    } catch {}
  }

  return { success: true, token: pairing.authToken };
}

export async function validatePairingToken(
  token: string
): Promise<{ valid: boolean; pairing?: ExtensionPairing; userId?: string }> {
  if (!token) return { valid: false };

  const db = readLocalDatabase();
  const pairing = db.pairings.find((p) => p.authToken === token && p.status === "ACTIVE");

  if (pairing) {
    pairing.lastUsedAt = new Date().toISOString();
    writeLocalDatabase(db);
    return { valid: true, pairing, userId: pairing.userId };
  }

  // Check Supabase if not found locally
  const supabase = createClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("extension_pairings")
        .select("*")
        .eq("auth_token", token)
        .eq("status", "ACTIVE")
        .single();

      if (!error && data) {
        return {
          valid: true,
          userId: data.user_id,
          pairing: {
            id: data.id,
            userId: data.user_id,
            pairingCode: data.pairing_code,
            authToken: data.auth_token,
            deviceName: data.device_name,
            status: data.status,
            expiresAt: data.expires_at,
            lastUsedAt: data.last_used_at,
          },
        };
      }
    } catch {}
  }

  return { valid: false };
}
