// ==============================================================================
// NEXUS Academic Intelligence Layer - Assignment Agent State Machine
// ==============================================================================

import {
  getAcademicItemById,
  saveRequirement,
  getItemRequirements,
  getOrCreateWorkspace,
  updateWorkspace,
  updateAcademicItemStatus,
  updateRequirementStatus,
} from "./storage";
import {
  extractRequirementsFromInstructions,
  generateAssignmentDraftContent,
  reviewAssignmentDeliverable,
} from "./aiProvider";
import { AcademicWorkspace } from "@/lib/types/academic";

/**
 * Step 1: Analyze Assignment & Extract Requirements
 */
export async function analyzeAssignment(itemId: string): Promise<{
  workspace: AcademicWorkspace;
  requirementsCount: number;
}> {
  const item = await getAcademicItemById(itemId);
  if (!item) {
    throw new Error("Academic item not found.");
  }

  // Update workspace state
  await updateWorkspace(itemId, { state: "ANALYZING" });

  // Gather material text if available
  const materialTexts = (item.attachments || [])
    .map((a) => a.extractedText)
    .filter(Boolean)
    .join("\n\n");

  const extracted = await extractRequirementsFromInstructions({
    title: item.title,
    instructions: item.instructions || item.description || "",
    materialsSummary: materialTexts,
  });

  // Save requirements
  for (let i = 0; i < extracted.length; i++) {
    const r = extracted[i];
    await saveRequirement({
      userId: item.userId,
      academicItemId: itemId,
      description: r.description,
      type: r.type,
      mandatory: r.mandatory,
      status: "NOT_STARTED",
      orderIndex: i,
    });
  }

  const workspace = await updateWorkspace(itemId, {
    state: "PLANNING",
  });

  await updateAcademicItemStatus(itemId, "IN_WORKSPACE");

  return {
    workspace,
    requirementsCount: extracted.length,
  };
}

/**
 * Step 2: Generate Assignment Draft & Perform Validation
 */
export async function generateAssignmentDraft(
  itemId: string,
  userDirectives?: string
): Promise<{
  workspace: AcademicWorkspace;
  draftContent: string;
}> {
  const item = await getAcademicItemById(itemId);
  if (!item) {
    throw new Error("Academic item not found.");
  }

  const requirements = await getItemRequirements(itemId);

  // Transition to GENERATING
  await updateWorkspace(itemId, { state: "GENERATING" });

  const draftContent = await generateAssignmentDraftContent({
    title: item.title,
    courseName: item.courseName,
    instructions: item.instructions || item.description || "",
    requirements,
    customPrompt: userDirectives,
  });

  // Transition to VALIDATING
  await updateWorkspace(itemId, { state: "VALIDATING" });

  // Perform Independent Review
  const reviewResult = await reviewAssignmentDeliverable({
    title: item.title,
    requirements,
    content: draftContent,
  });

  // Update requirement statuses based on review
  for (const req of requirements) {
    if (reviewResult.checks[req.description]) {
      await updateRequirementStatus(req.id, "SATISFIED", "Addressed in generated draft deliverable");
    }
  }

  // Save generated file in workspace
  const fileName = `${item.title.replace(/[^a-zA-Z0-9_\-]/g, "_")}_draft.md`;

  const workspace = await updateWorkspace(itemId, {
    state: "READY_FOR_REVIEW",
    generatedFiles: [
      {
        name: fileName,
        content: draftContent,
        mimeType: "text/markdown",
        size: draftContent.length,
      },
    ],
    reviewResults: reviewResult,
  });

  await updateAcademicItemStatus(itemId, "READY_FOR_REVIEW");

  return {
    workspace,
    draftContent,
  };
}

/**
 * Step 3: Human User Approval (Mandatory Step)
 * The agent can NEVER auto-approve. Human approval is strictly required.
 */
export async function approveAssignmentDraft(
  itemId: string,
  finalNotes?: string
): Promise<AcademicWorkspace> {
  const item = await getAcademicItemById(itemId);
  if (!item) {
    throw new Error("Academic item not found.");
  }

  const workspace = await updateWorkspace(itemId, {
    state: "FINALIZED",
    userApproved: true,
    approvedAt: new Date().toISOString(),
    finalNotes: finalNotes || "Approved by student for submission.",
  });

  await updateAcademicItemStatus(itemId, "FINALIZED", {
    userApproved: true,
    finalizedAt: new Date().toISOString(),
  });

  return workspace;
}
