import { UnifiedItem, Priority, ItemStatus } from "../types";
import { getStoredCredentials } from "./config";

export async function fetchLiveNotionItems(): Promise<UnifiedItem[]> {
  const creds = getStoredCredentials();
  if (!creds.notionApiKey || !creds.notionDatabaseId) {
    throw new Error("Notion API Key or Database ID is missing in settings.");
  }

  const res = await fetch(`https://api.notion.com/v1/databases/${creds.notionDatabaseId}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${creds.notionApiKey}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      page_size: 50,
      sorts: [{ timestamp: "created_time", direction: "descending" }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Notion API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const results = data.results || [];

  return results.map((page: any): UnifiedItem => {
    const props = page.properties || {};

    // 1. Extract Title
    let title = "Untitled Notion Item";
    for (const key of Object.keys(props)) {
      if (props[key].type === "title" && props[key].title?.length > 0) {
        title = props[key].title.map((t: { plain_text: string }) => t.plain_text).join("");
        break;
      }
    }

    // 2. Extract Status
    const statusVal =
      props.Status?.status?.name ||
      props.Stage?.select?.name ||
      props.State?.select?.name ||
      "In Progress";
    const lowerStatus = statusVal.toLowerCase();

    let status: ItemStatus = "pending";
    if (lowerStatus.includes("done") || lowerStatus.includes("complete") || lowerStatus.includes("closed")) {
      status = "completed";
    } else if (lowerStatus.includes("in progress") || lowerStatus.includes("doing") || lowerStatus.includes("working")) {
      status = "in_progress";
    }

    // 3. Extract Priority
    const priorityVal = props.Priority?.select?.name?.toLowerCase() || "medium";
    let priority: Priority = "medium";
    if (priorityVal.includes("urgent") || priorityVal.includes("critical") || priorityVal.includes("p0")) {
      priority = "critical";
    } else if (priorityVal.includes("high") || priorityVal.includes("p1")) {
      priority = "high";
    } else if (priorityVal.includes("low") || priorityVal.includes("p3")) {
      priority = "low";
    }

    // 4. Extract Tags
    const tags: string[] = ["Notion"];
    if (props.Tags?.multi_select) {
      for (const t of props.Tags.multi_select) {
        tags.push(t.name);
      }
    }

    // 5. Extract Due Date
    const dueDateStr =
      props["Due Date"]?.date?.start ||
      props.Date?.date?.start ||
      props.Deadline?.date?.start ||
      undefined;

    return {
      id: `notion-${page.id}`,
      externalId: page.id,
      source: "notion",
      title,
      description: "Notion database item",
      category: lowerStatus.includes("idea") ? "idea" : "project",
      priority,
      status,
      dueAt: dueDateStr ? new Date(dueDateStr).toISOString() : undefined,
      estimatedMinutes: 60,
      url: page.url,
      tags,
      createdAt: page.created_time || new Date().toISOString(),
      updatedAt: page.last_edited_time || new Date().toISOString(),
    };
  });
}

export async function createLiveNotionPage(title: string, category: "project" | "idea" = "project") {
  const creds = getStoredCredentials();
  if (!creds.notionApiKey || !creds.notionDatabaseId) {
    throw new Error("Notion API Key or Database ID is missing");
  }

  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${creds.notionApiKey}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      parent: { database_id: creds.notionDatabaseId },
      properties: {
        Name: {
          title: [{ text: { content: title } }],
        },
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to create Notion card: ${errText}`);
  }

  return await res.json();
}
