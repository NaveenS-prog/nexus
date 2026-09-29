// ==============================================================================
// NEXUS Academic Capture - Google Classroom DOM Extractor
// ==============================================================================

(function () {
  function extractClassroomData() {
    const url = window.location.href;

    // 1. Extract Course Name
    let courseName = "";
    let courseCode = "";
    let section = "";

    // Header selectors in Google Classroom
    const courseHeaderCandidates = [
      document.querySelector('[data-course-name]'),
      document.querySelector('nav h1'),
      document.querySelector('header h1'),
      document.querySelector('h1[title]'),
      document.querySelector('.wFEeHf'),
      document.querySelector('.A8uDEc'),
      document.querySelector('.onkcGd'),
      document.querySelector('[aria-label="Course name"]'),
    ];

    for (const el of courseHeaderCandidates) {
      if (el && el.textContent?.trim()) {
        courseName = el.getAttribute('data-course-name') || el.getAttribute('title') || el.textContent.trim();
        break;
      }
    }

    // Secondary line (section / code)
    const sectionCandidates = [
      document.querySelector('.YVvGBb.dDKNkc'),
      document.querySelector('.kox0cf'),
      document.querySelector('.VnOHwf'),
      document.querySelector('nav div[aria-hidden="true"]'),
    ];
    for (const el of sectionCandidates) {
      if (el && el.textContent?.trim() && el.textContent.trim() !== courseName) {
        section = el.textContent.trim();
        break;
      }
    }

    // 2. Extract Assignment / Material Title
    let title = "";
    const titleCandidates = [
      document.querySelector('main h1'),
      document.querySelector('[role="main"] h1'),
      document.querySelector('.tLDEHd'),
      document.querySelector('.asQ32c h1'),
      document.querySelector('div[role="heading"][aria-level="1"]'),
      document.querySelector('h1.YVvGBb'),
      document.querySelector('h1'),
    ];

    for (const el of titleCandidates) {
      if (el && el.textContent?.trim()) {
        const text = el.textContent.trim();
        // Avoid picking course name as item title
        if (text !== courseName && text.length > 2) {
          title = text;
          break;
        }
      }
    }

    // If still no title and in a stream, fallback to document title or first card
    if (!title) {
      const activeCard = document.querySelector('[role="article"] h2, [role="listitem"] h2, .A2d0be');
      if (activeCard && activeCard.textContent?.trim()) {
        title = activeCard.textContent.trim();
      } else {
        title = document.title.replace(/\s*-\s*Google Classroom\s*$/i, '').trim();
      }
    }

    // 3. Extract Due Date
    let dueAt = null;
    const dueDateCandidates = [
      document.querySelector('[aria-label*="Due"]'),
      document.querySelector('[aria-label*="due"]'),
      document.querySelector('.g3q4id'),
      document.querySelector('.kox0cf'),
      document.querySelector('.z3vRcc'),
      document.querySelector('.O98Lj'),
    ];

    for (const el of dueDateCandidates) {
      if (el && el.textContent?.trim()) {
        const text = el.textContent.trim();
        if (/due/i.test(text) || /tomorrow/i.test(text) || /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(text)) {
          dueAt = text.replace(/^due\s*:?\s*/i, '').trim();
          break;
        }
      }
    }

    // 4. Extract Description / Instructions
    let instructions = "";
    const instructionCandidates = [
      document.querySelector('.snByac'),
      document.querySelector('.dDKNkc'),
      document.querySelector('[data-item-description]'),
      document.querySelector('.A2d0be'),
      document.querySelector('.P3W0fd'),
      document.querySelector('[role="main"] div[dir="auto"]'),
    ];

    for (const el of instructionCandidates) {
      if (el && el.innerText?.trim()) {
        const text = el.innerText.trim();
        if (text !== title && text !== courseName && text.length > instructions.length) {
          instructions = text;
        }
      }
    }

    // 5. Extract Attachments
    const attachments = [];
    const seenUrls = new Set();

    const attachmentLinks = document.querySelectorAll(
      'a[href*="drive.google.com"], a[href*="docs.google.com"], a[href*="youtube.com"], a.urw7e, a.MymH0d, div[data-attachment-id] a'
    );

    attachmentLinks.forEach((link) => {
      const href = link.href;
      if (!href || seenUrls.has(href)) return;
      seenUrls.add(href);

      const nameEl = link.querySelector('.snByac, .A2d0be, .YVvGBb, [dir="ltr"]') || link;
      const name = nameEl.textContent?.trim() || "Course Attachment";

      let type = "link";
      if (href.includes("drive.google.com") || href.includes("docs.google.com")) type = "drive";
      else if (href.includes("youtube.com") || href.includes("youtu.be")) type = "youtube";

      attachments.push({
        name,
        url: href,
        type,
      });
    });

    return {
      source: "CLASSROOM_BROWSER",
      sourceUrl: url,
      courseName: courseName || "Google Classroom Course",
      courseCode,
      section,
      title: title || "Classroom Item",
      description: instructions,
      instructions,
      dueAt,
      attachments,
    };
  }

  // Handle messages from popup requesting extraction
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "EXTRACT_CLASSROOM_DATA") {
      try {
        const data = extractClassroomData();
        sendResponse({ success: true, data });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    }
    return true;
  });
})();
