// ==============================================================================
// NEXUS Academic Capture - Popup Controller
// ==============================================================================

let currentExtractedData = null;

document.addEventListener("DOMContentLoaded", async () => {
  const unpairedView = document.getElementById("unpairedView");
  const pairedView = document.getElementById("pairedView");
  const statusDot = document.getElementById("statusDot");
  const statusLabel = document.getElementById("statusLabel");

  const btnPair = document.getElementById("btnPair");
  const pairError = document.getElementById("pairError");
  const pairingCodeInput = document.getElementById("pairingCode");
  const nexusHostInput = document.getElementById("nexusHost");

  const notClassroomAlert = document.getElementById("notClassroomAlert");
  const captureCard = document.getElementById("captureCard");
  const previewCourse = document.getElementById("previewCourse");
  const previewTitle = document.getElementById("previewTitle");
  const previewDue = document.getElementById("previewDue");
  const previewAttachments = document.getElementById("previewAttachments");

  const btnSendToNexus = document.getElementById("btnSendToNexus");
  const btnRescan = document.getElementById("btnRescan");
  const ingestFeedback = document.getElementById("ingestFeedback");

  const btnToggleManual = document.getElementById("btnToggleManual");
  const manualForm = document.getElementById("manualForm");
  const btnSubmitManual = document.getElementById("btnSubmitManual");

  // 1. Check Connection Status
  async function refreshStatus() {
    chrome.runtime.sendMessage({ action: "GET_CONNECTION_STATUS" }, async (res) => {
      if (res && res.connected) {
        statusDot.classList.add("connected");
        statusLabel.textContent = "CONNECTED";
        unpairedView.classList.add("hidden");
        pairedView.classList.remove("hidden");
        await scanActiveTab();
      } else {
        statusDot.classList.remove("connected");
        statusLabel.textContent = "UNPAIRED";
        unpairedView.classList.remove("hidden");
        pairedView.classList.add("hidden");
      }
    });
  }

  // 2. Scan Current Active Tab
  async function scanActiveTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.url) return;

      const isClassroom = tab.url.includes("classroom.google.com");

      if (!isClassroom) {
        notClassroomAlert.classList.remove("hidden");
        captureCard.classList.add("hidden");
        return;
      }

      notClassroomAlert.classList.add("hidden");
      captureCard.classList.remove("hidden");
      previewCourse.textContent = "Extracting details...";

      // Inject content script into active Classroom tab
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"],
      });

      // Send message to extract data
      chrome.tabs.sendMessage(tab.id, { action: "EXTRACT_CLASSROOM_DATA" }, (response) => {
        if (response && response.success && response.data) {
          currentExtractedData = response.data;
          previewCourse.textContent = response.data.courseName || "Classroom Course";
          previewTitle.textContent = response.data.title || "Untitled Item";
          previewDue.textContent = response.data.dueAt ? `Due: ${response.data.dueAt}` : "No due date";
          const attCount = response.data.attachments ? response.data.attachments.length : 0;
          previewAttachments.textContent = `${attCount} attachment${attCount !== 1 ? "s" : ""}`;
          btnSendToNexus.disabled = false;
        } else {
          previewCourse.textContent = "Could not parse page";
          previewTitle.textContent = "Please ensure you have an assignment or material opened.";
          btnSendToNexus.disabled = true;
        }
      });
    } catch (err) {
      console.warn("Scan error:", err);
      previewCourse.textContent = "Scan unavailable";
      previewTitle.textContent = "Reload the page and try again.";
    }
  }

  // 3. Handle Pairing Form Submission
  btnPair.addEventListener("click", () => {
    const code = pairingCodeInput.value.trim();
    const host = nexusHostInput.value.trim() || "http://localhost:3000";

    if (!code) {
      pairError.textContent = "Please enter the pairing code from NEXUS Settings.";
      pairError.classList.remove("hidden");
      return;
    }

    btnPair.textContent = "Authenticating...";
    btnPair.disabled = true;
    pairError.classList.add("hidden");

    chrome.runtime.sendMessage(
      { action: "PAIR_EXTENSION", data: { pairingCode: code, host } },
      (res) => {
        btnPair.textContent = "Pair with NEXUS";
        btnPair.disabled = false;

        if (res && res.success) {
          refreshStatus();
        } else {
          pairError.textContent = res ? res.error : "Failed to connect to NEXUS server.";
          pairError.classList.remove("hidden");
        }
      }
    );
  });

  // 4. Handle "Send to NEXUS" Click
  btnSendToNexus.addEventListener("click", () => {
    if (!currentExtractedData) return;

    btnSendToNexus.textContent = "Sending to NEXUS...";
    btnSendToNexus.disabled = true;
    ingestFeedback.classList.add("hidden");

    chrome.runtime.sendMessage(
      { action: "INGEST_CONTENT", data: currentExtractedData },
      (res) => {
        btnSendToNexus.textContent = "Send to NEXUS";
        btnSendToNexus.disabled = false;

        if (res && res.success) {
          ingestFeedback.className = "alert alert-success";
          ingestFeedback.textContent = res.message || "Captured successfully into NEXUS!";
          ingestFeedback.classList.remove("hidden");
        } else {
          ingestFeedback.className = "alert alert-error";
          ingestFeedback.textContent = res ? res.error : "Ingestion failed.";
          ingestFeedback.classList.remove("hidden");
        }
      }
    );
  });

  // 5. Handle Re-scan Button
  btnRescan.addEventListener("click", () => {
    scanActiveTab();
  });

  // 6. Manual Entry Fallback Toggle
  btnToggleManual.addEventListener("click", () => {
    manualForm.classList.toggle("hidden");
  });

  // 7. Manual Entry Submission
  btnSubmitManual.addEventListener("click", async () => {
    const courseName = document.getElementById("manualCourse").value.trim();
    const title = document.getElementById("manualTitle").value.trim();
    const dueAt = document.getElementById("manualDue").value.trim();
    const instructions = document.getElementById("manualInstructions").value.trim();

    if (!courseName || !title) {
      alert("Course Name and Title are required.");
      return;
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentUrl = tab?.url || "https://classroom.google.com";

    const payload = {
      source: "MANUAL",
      sourceUrl: currentUrl,
      courseName,
      title,
      dueAt: dueAt || null,
      instructions,
      description: instructions,
      attachments: [],
    };

    btnSubmitManual.textContent = "Sending...";
    btnSubmitManual.disabled = true;

    chrome.runtime.sendMessage(
      { action: "INGEST_CONTENT", data: payload },
      (res) => {
        btnSubmitManual.textContent = "Send Manual Item to NEXUS";
        btnSubmitManual.disabled = false;

        if (res && res.success) {
          ingestFeedback.className = "alert alert-success";
          ingestFeedback.textContent = res.message || "Item captured successfully!";
          ingestFeedback.classList.remove("hidden");
          manualForm.classList.add("hidden");
        } else {
          ingestFeedback.className = "alert alert-error";
          ingestFeedback.textContent = res ? res.error : "Failed to capture manual item.";
          ingestFeedback.classList.remove("hidden");
        }
      }
    );
  });

  // Initial load
  await refreshStatus();
});
