// ==============================================================================
// NEXUS Academic Capture - Chrome Background Service Worker
// ==============================================================================

chrome.runtime.onInstalled.addListener(() => {
  console.log("[NEXUS] Academic Capture Extension installed.");
});

// Message listener for popup & content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "PAIR_EXTENSION") {
    handlePairExtension(request.data)
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // Keep channel open for async response
  }

  if (request.action === "INGEST_CONTENT") {
    handleIngestContent(request.data)
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === "GET_CONNECTION_STATUS") {
    getConnectionStatus()
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

async function getConnectionStatus() {
  const data = await chrome.storage.local.get(["nexusHost", "nexusToken"]);
  const host = data.nexusHost || "http://localhost:3000";
  const token = data.nexusToken || null;
  return { connected: Boolean(token), host, token };
}

async function handlePairExtension(payload) {
  const host = payload.host || "http://localhost:3000";
  const pairingCode = payload.pairingCode;

  if (!pairingCode) {
    throw new Error("Pairing code is missing.");
  }

  const endpoint = `${host.replace(/\/+$/, "")}/api/extension/pair`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pairingCode,
      deviceName: "Chrome Extension (" + (navigator.userAgent.includes("Windows") ? "Windows" : "Browser") + ")",
    }),
  });

  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.error || "Failed to pair with NEXUS.");
  }

  // Store token and host
  await chrome.storage.local.set({
    nexusHost: host,
    nexusToken: json.token,
  });

  return { success: true, message: "Paired successfully with NEXUS!" };
}

async function handleIngestContent(payload) {
  const data = await chrome.storage.local.get(["nexusHost", "nexusToken"]);
  const host = data.nexusHost || "http://localhost:3000";
  const token = data.nexusToken;

  if (!token) {
    throw new Error("Extension is not paired with NEXUS. Please enter your pairing code.");
  }

  const endpoint = `${host.replace(/\/+$/, "")}/api/academic/ingest`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.error || "Failed to ingest item into NEXUS.");
  }

  return json;
}
