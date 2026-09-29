// ==============================================================================
// NEXUS Academic Intelligence Layer - Types & Domain Models
// ==============================================================================

export type AcademicSource =
  | 'CLASSROOM_BROWSER'
  | 'CLASSROOM_API'
  | 'MANUAL'
  | 'FILE_IMPORT'
  | 'EMAIL'
  | 'CALENDAR';

export type AcademicItemType =
  | 'ASSIGNMENT'
  | 'LECTURE_MATERIAL'
  | 'REFERENCE_MATERIAL'
  | 'ANNOUNCEMENT'
  | 'EXAM'
  | 'PROJECT'
  | 'LAB'
  | 'READING'
  | 'SCHEDULE_CHANGE'
  | 'UNKNOWN';

export type AcademicItemStatus =
  | 'NEW'
  | 'PROCESSING'
  | 'TASK_CREATED'
  | 'ORGANIZED'
  | 'IN_WORKSPACE'
  | 'READY_FOR_REVIEW'
  | 'USER_APPROVED'
  | 'FINALIZED'
  | 'COMPLETED'
  | 'ARCHIVED';

export type AcademicPriority = 'low' | 'medium' | 'high' | 'critical';

export interface AcademicCourse {
  id: string;
  userId?: string;
  externalCourseId?: string;
  source: AcademicSource;
  connectedAccountId?: string;
  name: string;
  courseCode?: string;
  section?: string;
  teacherName?: string;
  driveFolderId?: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type AttachmentDownloadStatus =
  | 'NOT_REQUESTED'
  | 'QUEUED'
  | 'DOWNLOADING'
  | 'DOWNLOADED'
  | 'FAILED'
  | 'UNAVAILABLE';

export type AttachmentProcessingStatus =
  | 'NOT_PROCESSED'
  | 'PROCESSING'
  | 'PROCESSED'
  | 'FAILED';

export interface AcademicAttachment {
  id: string;
  userId?: string;
  academicItemId: string;
  source: AcademicSource;
  sourceExternalId?: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  sourceUrl?: string;
  downloadStatus: AttachmentDownloadStatus;
  storagePath?: string;
  contentHash?: string;
  driveFileId?: string;
  driveFolderId?: string;
  processingStatus: AttachmentProcessingStatus;
  extractedText?: string;
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export type RequirementType =
  | 'DELIVERABLE'
  | 'FORMAT'
  | 'WORD_COUNT'
  | 'CODE'
  | 'REFERENCE'
  | 'SUBMISSION'
  | 'RUBRIC'
  | 'OTHER';

export type RequirementStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'SATISFIED'
  | 'WARNING'
  | 'FAILED';

export interface AcademicRequirement {
  id: string;
  userId?: string;
  academicItemId: string;
  description: string;
  type: RequirementType;
  mandatory: boolean;
  status: RequirementStatus;
  sourceReference?: string;
  evidence?: string;
  orderIndex?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type AcademicWorkspaceState =
  | 'DETECTED'
  | 'ANALYZING'
  | 'COLLECTING_MATERIALS'
  | 'PLANNING'
  | 'GENERATING'
  | 'VALIDATING'
  | 'READY_FOR_REVIEW'
  | 'USER_APPROVED'
  | 'FINALIZED'
  | 'READY_FOR_SUBMISSION'
  | 'FAILED'
  | 'REQUIRES_USER_INPUT';

export type DeliverableType =
  | 'PDF'
  | 'DOCX'
  | 'PPTX'
  | 'CODE'
  | 'MARKDOWN'
  | 'CSV'
  | 'XLSX'
  | 'OTHER';

export interface GeneratedFile {
  name: string;
  path?: string;
  content?: string;
  mimeType?: string;
  size?: number;
}

export interface ReviewResult {
  score?: number;
  passed: boolean;
  feedback: string[];
  checks: Record<string, boolean>;
  evaluatedAt: string;
}

export interface AcademicWorkspace {
  id: string;
  userId?: string;
  academicItemId: string;
  state: AcademicWorkspaceState;
  deliverableType: DeliverableType;
  activeVersion: number;
  generatedFiles: GeneratedFile[];
  reviewResults?: ReviewResult;
  userApproved: boolean;
  approvedAt?: string;
  finalNotes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AcademicItem {
  id: string;
  userId?: string;
  source: AcademicSource;
  sourceAccountId?: string;
  sourceExternalId?: string;
  sourceUrl?: string;
  type: AcademicItemType;
  courseId?: string;
  courseName: string;
  courseCode?: string;
  courseSection?: string;
  title: string;
  description?: string;
  instructions?: string;
  publishedAt?: string;
  dueAt?: string;
  status: AcademicItemStatus;
  priority: AcademicPriority;
  taskId?: string;
  metadata?: Record<string, any>;
  rawSourceData?: Record<string, any>;
  attachments?: AcademicAttachment[];
  requirements?: AcademicRequirement[];
  workspace?: AcademicWorkspace;
  createdAt?: string;
  updatedAt?: string;
}

// -----------------------------------------------------------------------------
// Browser Extension Protocol & Ingestion Contracts
// -----------------------------------------------------------------------------

export interface ExtensionPairing {
  id: string;
  userId: string;
  pairingCode: string;
  authToken: string;
  deviceName: string;
  status: 'PENDING' | 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  expiresAt: string;
  lastUsedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RawClassroomAttachment {
  name: string;
  url: string;
  mimeType?: string;
  type?: 'drive' | 'youtube' | 'link' | 'file';
  driveFileId?: string;
  thumbnailUrl?: string;
}

export interface ExtensionCapturePayload {
  source: 'CLASSROOM_BROWSER' | 'MANUAL';
  sourceExternalId?: string;
  sourceUrl: string;
  courseName: string;
  courseCode?: string;
  section?: string;
  title: string;
  description?: string;
  instructions?: string;
  dueAt?: string | null;
  publishedAt?: string | null;
  attachments?: RawClassroomAttachment[];
  accountEmail?: string;
  metadata?: Record<string, any>;
}

export interface IngestionResult {
  success: boolean;
  item: AcademicItem;
  created: boolean;
  taskId?: string;
  organizedToDrive?: boolean;
  message?: string;
}
