// Content script for Marky Text Highlighter (v1.4.0)
// console.log("Marky: Content script loading...");

class MarkyHighlighter {
  constructor() {
    this.storageKey = this.getStorageKey();
    this.isReady = false;
    this.init();
  }

  // Generate multiple storage keys for better persistence
  getStorageKeys() {
    const origin = window.location.origin;
    let path = window.location.pathname;

    // Normalize path by removing trailing slash if it exists
    if (path.length > 1 && path.endsWith("/")) {
      path = path.slice(0, -1);
    }

    // Generate multiple keys for different URL variations
    const keys = [];

    // 1. Full URL with search params
    const fullUrl = `${origin}${path}${window.location.search}`;
    keys.push(`highlights_${btoa(fullUrl).replace(/[^a-zA-Z0-9]/g, "")}`);

    // 2. URL without search params (most reliable)
    const baseUrl = `${origin}${path}`;
    keys.push(`highlights_${btoa(baseUrl).replace(/[^a-zA-Z0-9]/g, "")}`);

    // 3. Simple hash-based key (fallback)
    const simpleKey = `highlights_${origin.replace(
      /[^a-zA-Z0-9]/g,
      ""
    )}_${path.replace(/[^a-zA-Z0-9]/g, "")}`;
    keys.push(simpleKey);

    return keys;
  }

  // Get the primary storage key (first one)
  getStorageKey() {
    return this.getStorageKeys()[0];
  }

  // Initialize the highlighter
  async init() {
    console.log("Marky: Initializing highlighter..."); // Re-enable for debugging
    try {
      this.setupClickHandlers();
      this.setupKeyboardShortcuts();
      await this.restoreHighlights();
      this.setupMutationObserver();
      this.isReady = true;
      console.log("Marky: Highlighter is ready!"); // Re-enable for debugging
    } catch (error) {
      console.error("Marky: Failed to initialize:", error);
    }
  }

  // Setup additional keyboard shortcuts that Chrome's command API can't handle
  setupKeyboardShortcuts() {
    document.addEventListener("keydown", (e) => {
      // Only handle shortcuts if we're ready and have text selected
      if (!this.isReady) return;

      const hasSelection =
        window.getSelection().rangeCount > 0 &&
        !window.getSelection().isCollapsed;
      if (!hasSelection) return;

      // Check for all our shortcuts (including Chrome API ones as fallback)
      // Handle both Ctrl (Windows/Linux) and Cmd (Mac)
      const isModifierPressed =
        (e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey;

      if (isModifierPressed) {
        let color = null;

        switch (e.key.toUpperCase()) {
          case "Y":
            color = "yellow";
            break;
          case "K":
            color = "green";
            break;
          case "U":
            color = "blue";
            break;
          case "P":
            color = "pink";
            break;
          case "O":
            color = "orange";
            break;
        }

        if (color) {
          e.preventDefault();
          e.stopPropagation();
          this.highlightSelectedText(color);
        }
      }
    });
  }

  // Set up mutation observer to handle dynamic content
  setupMutationObserver() {
    let restoreTimeout = null;

    const observer = new MutationObserver((mutations) => {
      let shouldRestore = false;

      for (const mutation of mutations) {
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            // Skip our own highlight elements
            if (
              node.nodeType === Node.ELEMENT_NODE &&
              !node.classList?.contains("text-highlighter-highlight") &&
              !node.closest?.(".text-highlighter-highlight") &&
              node.textContent.trim().length > 20
            ) {
              // Only for substantial content
              shouldRestore = true;
              break;
            }
          }
        }
      }

      if (shouldRestore) {
        // Debounce restore calls to avoid excessive processing
        if (restoreTimeout) {
          clearTimeout(restoreTimeout);
        }
        restoreTimeout = setTimeout(() => {
          this.restoreHighlights();
          restoreTimeout = null;
        }, 1000); // Increased delay for better performance
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: false,
    });
  }

  // Highlight the currently selected text
  highlightSelectedText(color = "yellow", note = "") {
    if (!this.isReady) {
      // console.warn("Marky: Highlighter not ready yet, cannot highlight.");
      return;
    }

    const selection = window.getSelection();
    if (!selection.rangeCount || selection.isCollapsed) {
      // console.log("Marky: No text selected to highlight.");
      return;
    }

    const range = selection.getRangeAt(0);
    // CRITICAL FIX: Do NOT trim the text content. Offsets rely on the raw text.
    const text = range.toString();

    if (!text.trim()) {
      // console.log("Marky: Selection contains only whitespace.");
      return;
    }

    // console.log(`Marky: Highlighting text with color: ${color}`);

    try {
      // Get surrounding context for better restoration
      const startContainer = range.startContainer;
      const endContainer = range.endContainer;

      let contextBefore = "";
      let contextAfter = "";

      try {
        // Get text context before the highlight
        if (startContainer.nodeType === Node.TEXT_NODE) {
          const beforeText = startContainer.textContent.substring(
            0,
            range.startOffset
          );
          contextBefore = beforeText.slice(-50); // Last 50 chars before
        }

        // Get text context after the highlight
        if (endContainer.nodeType === Node.TEXT_NODE) {
          const afterText = endContainer.textContent.substring(range.endOffset);
          contextAfter = afterText.slice(0, 50); // First 50 chars after
        }
      } catch (contextError) {
        // Context extraction failed, continue without context
      }

      const highlightData = {
        id: `highlight_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`,
        text: text, // Save the raw text content
        color: color,
        note: note || "",
        startContainerXPath: this.getXPathForElement(range.startContainer),
        startOffset: range.startOffset,
        endContainerXPath: this.getXPathForElement(range.endContainer),
        endOffset: range.endOffset,
        contextBefore: contextBefore,
        contextAfter: contextAfter,
        timestamp: Date.now(),
        url: window.location.href,
        title: document.title,
      };

      this.applyHighlight(range, highlightData.id, color);
      this.saveHighlight(highlightData);
      selection.removeAllRanges();

      // Show note prompt if no note was provided
      // if (!note) {
      //   setTimeout(() => this.promptForNote(highlightData.id), 100);
      // }
    } catch (error) {
      console.error("Marky: Error applying highlight:", error);
    }
  }

  // Apply the visual span wrapper to a range
  applyHighlight(range, highlightId, color) {
    try {
      // Check if range is valid
      if (!range || range.collapsed) {
        return;
      }

      const span = document.createElement("span");
      span.className = `text-highlighter-highlight text-highlighter-${color}`;
      span.dataset.highlightId = highlightId;
      span.dataset.color = color;

      // Try the simple approach first
      try {
        range.surroundContents(span);
      } catch (e) {
        // Fallback for complex ranges
        try {
          const contents = range.extractContents();
          span.appendChild(contents);
          range.insertNode(span);
        } catch (e2) {
          // Final fallback - clone and replace
          const contents = range.cloneContents();
          span.appendChild(contents);
          range.deleteContents();
          range.insertNode(span);
        }
      }
    } catch (error) {
      // Silently skip problematic highlights
      // console.error("Marky: Error applying highlight:", error);
    }
  }

  // Generate a more stable XPath for a given element
  getXPathForElement(element) {
    if (element.id) {
      return `id("${element.id}")`;
    }
    if (element.nodeType === Node.TEXT_NODE) {
      element = element.parentNode;
    }

    const path = [];
    while (element && element.nodeType === Node.ELEMENT_NODE) {
      let selector = element.nodeName.toLowerCase();
      let sibling = element;
      let siblingIndex = 1;
      while ((sibling = sibling.previousElementSibling)) {
        if (sibling.nodeName.toLowerCase() === selector) {
          siblingIndex++;
        }
      }
      selector += `[${siblingIndex}]`;
      path.unshift(selector);
      element = element.parentNode;
    }
    return path.length ? "/" + path.join("/") : null;
  }

  // Find an element by its XPath
  getElementByXPath(xpath) {
    if (!xpath) return null;
    return document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue;
  }

  // Save a highlight object to local storage
  async saveHighlight(highlightData) {
    try {
      const result = await chrome.storage.local.get(this.storageKey);
      const highlights = result[this.storageKey] || [];
      highlights.push(highlightData);
      await chrome.storage.local.set({ [this.storageKey]: highlights });
      // console.log("Marky: Highlight saved.", highlightData);
    } catch (error) {
      console.error("Marky: Failed to save highlight:", error);
    }
  }

  // Restore all highlights from storage on page load
  async restoreHighlights() {
    try {
      const keys = this.getStorageKeys();
      let allHighlights = [];

      // Try to load from all possible storage keys
      for (const key of keys) {
        try {
          const result = await chrome.storage.local.get(key);
          const highlights = result[key] || [];
          if (highlights.length > 0) {
            allHighlights = allHighlights.concat(highlights);
          }
        } catch (error) {
          // Continue trying other keys
        }
      }

      // Remove duplicates based on highlight ID
      const uniqueHighlights = allHighlights.filter(
        (highlight, index, arr) =>
          arr.findIndex((h) => h.id === highlight.id) === index
      );

      console.log(
        `Marky: Found ${uniqueHighlights.length} highlights to restore from ${keys.length} storage locations.`
      );
      uniqueHighlights.forEach((h) => this.recreateHighlight(h));

      // If we found highlights in alternative storage, migrate them to primary storage
      if (
        uniqueHighlights.length > 0 &&
        allHighlights.length > uniqueHighlights.length
      ) {
        await this.saveAllHighlights(uniqueHighlights);
      }
    } catch (error) {
      console.error("Marky: Failed to restore highlights:", error);
    }
  }

  // Save all highlights to primary storage
  async saveAllHighlights(highlights) {
    try {
      await chrome.storage.local.set({ [this.storageKey]: highlights });
    } catch (error) {
      console.error("Marky: Failed to save highlights:", error);
    }
  }

  // Recreate a single highlight on the page from stored data
  recreateHighlight(highlight) {
    try {
      // Skip if highlight already exists
      if (document.querySelector(`[data-highlight-id="${highlight.id}"]`)) {
        return;
      }

      const startElement = this.getElementByXPath(
        highlight.startContainerXPath
      );
      const endElement = this.getElementByXPath(highlight.endContainerXPath);

      if (!startElement || !endElement) {
        // Try text matching with context-aware search
        this.recreateHighlightByText(highlight);
        return;
      }

      const startNode = this.findTextNode(startElement, highlight.startOffset);
      const endNode = this.findTextNode(endElement, highlight.endOffset);

      if (!startNode || !endNode) {
        // Try text matching with context-aware search
        this.recreateHighlightByText(highlight);
        return;
      }

      const range = document.createRange();
      try {
        range.setStart(
          startNode,
          Math.min(highlight.startOffset, startNode.textContent.length)
        );
        range.setEnd(
          endNode,
          Math.min(highlight.endOffset, endNode.textContent.length)
        );
      } catch (rangeError) {
        // Try text matching with context-aware search
        this.recreateHighlightByText(highlight);
        return;
      }

      // Verify that the text content still matches (with some tolerance)
      const currentText = range.toString();
      if (currentText !== highlight.text) {
        // Try fuzzy matching for minor differences (whitespace, etc.)
        if (!this.isTextSimilar(currentText, highlight.text)) {
          // Use context-aware text search as fallback
          this.recreateHighlightByText(highlight);
          return;
        }
      }

      this.applyHighlight(range, highlight.id, highlight.color || "yellow");
    } catch (error) {
      // Silently skip problematic highlights to avoid console spam
      // console.error("Marky: Failed to recreate highlight:", highlight, error);
    }
  }

  // Alternative highlight recreation using context-aware text search
  recreateHighlightByText(highlight) {
    try {
      const text = highlight.text;
      if (!text || text.length < 1) return; // Allow even single characters

      // Get surrounding context from the original highlight if available
      const contextBefore = highlight.contextBefore || "";
      const contextAfter = highlight.contextAfter || "";

      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );

      let bestMatch = null;
      let bestScore = 0;
      let foundMatches = [];

      let node;
      while ((node = walker.nextNode())) {
        const nodeText = node.textContent;
        let searchIndex = 0;

        // Find all occurrences of the text in this node
        while (true) {
          const index = nodeText.indexOf(text, searchIndex);
          if (index === -1) break;

          // Check if this text is already highlighted
          const parent = node.parentNode;
          if (
            parent &&
            parent.classList &&
            parent.classList.contains("text-highlighter-highlight")
          ) {
            searchIndex = index + 1;
            continue;
          }

          // Calculate context match score
          let score = 1; // Base score for finding the text

          // If we have context, use it for precise matching
          if (contextBefore || contextAfter) {
            const beforeText = nodeText.substring(
              Math.max(0, index - 100),
              index
            );
            const afterText = nodeText.substring(
              index + text.length,
              index + text.length + 100
            );

            // Score based on context similarity
            if (contextBefore) {
              const contextMatch = contextBefore.slice(-30); // Last 30 chars
              if (beforeText.includes(contextMatch)) {
                score += 20; // High score for context match
              } else if (beforeText.includes(contextMatch.slice(-15))) {
                score += 10; // Partial context match
              }
            }

            if (contextAfter) {
              const contextMatch = contextAfter.slice(0, 30); // First 30 chars
              if (afterText.includes(contextMatch)) {
                score += 20; // High score for context match
              } else if (afterText.includes(contextMatch.slice(0, 15))) {
                score += 10; // Partial context match
              }
            }
          } else {
            // No context available - use first occurrence (legacy behavior)
            score = 5;
          }

          foundMatches.push({ node, index, score });

          searchIndex = index + 1;
        }
      }

      // Find the best match
      if (foundMatches.length > 0) {
        // Sort by score (highest first)
        foundMatches.sort((a, b) => b.score - a.score);
        bestMatch = foundMatches[0];

        // If we have context but no good matches, try the first occurrence
        if (bestMatch.score <= 1 && foundMatches.length > 0) {
          bestMatch = foundMatches[0]; // Use first occurrence as fallback
        }
      }

      // Apply the best match found
      if (bestMatch) {
        const range = document.createRange();
        range.setStart(bestMatch.node, bestMatch.index);
        range.setEnd(bestMatch.node, bestMatch.index + text.length);

        this.applyHighlight(range, highlight.id, highlight.color || "yellow");
      }
    } catch (error) {
      // Silently skip
    }
  }

  // Check if two text strings are similar (allowing for minor differences)
  isTextSimilar(text1, text2) {
    if (!text1 || !text2) return false;

    // Normalize whitespace
    const normalize = (str) => str.replace(/\s+/g, " ").trim();
    const norm1 = normalize(text1);
    const norm2 = normalize(text2);

    // Allow for small differences
    if (norm1 === norm2) return true;
    if (Math.abs(norm1.length - norm2.length) > 5) return false;

    // Simple similarity check
    const longer = norm1.length > norm2.length ? norm1 : norm2;
    const shorter = norm1.length > norm2.length ? norm2 : norm1;

    return longer.includes(shorter) || shorter.includes(longer);
  }

  // Find the correct text node within a container element
  findTextNode(container, offset) {
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    let node;
    let currentOffset = 0;
    while ((node = walker.nextNode())) {
      const nodeLength = node.textContent.length;
      if (currentOffset + nodeLength >= offset) {
        return node;
      }
      currentOffset += nodeLength;
    }
    // Fallback if not found (e.g., offset is at the very end)
    walker.currentNode = container;
    return walker.lastChild();
  }

  // Set up click handlers for removing highlights
  setupClickHandlers() {
    document.addEventListener("click", async (event) => {
      const highlight = event.target.closest(".text-highlighter-highlight");
      if (highlight) {
        event.preventDefault();
        event.stopPropagation();
        await this.showHighlightContextMenu(
          event,
          highlight.dataset.highlightId
        );
      }
    });
  }

  // Show context menu for highlighted text
  async showHighlightContextMenu(event, highlightId) {
    const highlight = await this.getHighlightById(highlightId);
    if (!highlight) return;

    const menu = document.createElement("div");
    menu.className = "marky-context-menu";
    menu.style.cssText = `
      position: fixed;
      top: ${event.clientY}px;
      left: ${event.clientX}px;
      background: white;
      border: 1px solid #ddd;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      min-width: 160px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
    `;

    const noteText = highlight.note
      ? highlight.note.substring(0, 50) +
        (highlight.note.length > 50 ? "..." : "")
      : "Add note";

    menu.innerHTML = `
      <div style="padding: 8px 12px; border-bottom: 1px solid #eee; cursor: pointer;" class="marky-menu-item" data-action="note">
        📝 ${noteText}
      </div>
      <div style="padding: 8px 12px; cursor: pointer; color: #d73a49;" class="marky-menu-item" data-action="remove">
        🗑️ Remove highlight
      </div>
    `;

    document.body.appendChild(menu);

    // Handle menu clicks
    menu.addEventListener("click", async (e) => {
      const action = e.target.closest(".marky-menu-item")?.dataset.action;
      if (action === "note") {
        await this.editHighlightNote(highlightId);
      } else if (action === "remove") {
        const highlightElement = document.querySelector(
          `[data-highlight-id="${highlightId}"]`
        );
        await this.removeHighlight(highlightId);
        if (highlightElement) {
          this.unwrapHighlight(highlightElement);
        }
      }
      // Safely remove menu
      try {
        if (menu && document.contains(menu) && menu.parentNode) {
          menu.parentNode.removeChild(menu);
        }
      } catch (error) {
        // Silently handle removal errors
      }
    });

    // Remove menu when clicking elsewhere
    setTimeout(() => {
      const removeMenu = () => {
        try {
          if (menu && document.contains(menu) && menu.parentNode) {
            menu.parentNode.removeChild(menu);
          }
        } catch (error) {
          // Silently handle removal errors
        }
        document.removeEventListener("click", removeMenu);
      };
      document.addEventListener("click", removeMenu);
    }, 100);
  }

  // Get highlight data by ID
  async getHighlightById(highlightId) {
    try {
      const storageKeys = this.getStorageKeys();
      const result = await chrome.storage.local.get(storageKeys);

      // Check all possible storage locations
      for (const key of storageKeys) {
        const highlights = result[key] || [];
        const found = highlights.find((h) => h.id === highlightId);
        if (found) return found;
      }

      return null;
    } catch (error) {
      console.error("Marky: Failed to get highlight:", error);
      return null;
    }
  }

  // Prompt for note on new highlight
  async promptForNote(highlightId) {
    const note = prompt("Add a note to this highlight (optional):", "");
    if (note !== null) {
      await this.updateHighlightNote(highlightId, note);
    }
  }

  // Edit highlight note
  async editHighlightNote(highlightId) {
    const highlight = await this.getHighlightById(highlightId);
    const currentNote = highlight?.note || "";
    const newNote = prompt("Edit note:", currentNote);
    if (newNote !== null) {
      await this.updateHighlightNote(highlightId, newNote);
    }
  }

  // Update highlight note
  async updateHighlightNote(highlightId, note) {
    try {
      const storageKeys = this.getStorageKeys();
      const result = await chrome.storage.local.get(storageKeys);

      // Find and update in the correct storage location
      for (const key of storageKeys) {
        const highlights = result[key] || [];
        const highlightIndex = highlights.findIndex(
          (h) => h.id === highlightId
        );

        if (highlightIndex !== -1) {
          highlights[highlightIndex].note = note;
          await chrome.storage.local.set({ [key]: highlights });
          // console.log("Marky: Note updated for highlight:", highlightId);
          return;
        }
      }
    } catch (error) {
      console.error("Marky: Failed to update note:", error);
    }
  }

  // Remove a highlight from storage by its ID
  async removeHighlight(highlightId) {
    try {
      const storageKeys = this.getStorageKeys();
      const result = await chrome.storage.local.get(storageKeys);
      let found = false;

      // Remove from all possible storage locations
      for (const key of storageKeys) {
        let highlights = result[key] || [];
        const initialCount = highlights.length;
        highlights = highlights.filter((h) => h.id !== highlightId);

        if (highlights.length < initialCount) {
          await chrome.storage.local.set({ [key]: highlights });
          found = true;
        }
      }

      // if (found) console.log(`Marky: Removed highlight ${highlightId}`);
    } catch (error) {
      console.error("Marky: Error removing highlight:", error);
    }
  }

  // Remove the highlight span and restore the original DOM
  unwrapHighlight(highlightElement) {
    try {
      if (!highlightElement) {
        return;
      }

      // Check if element is still in the DOM
      if (!document.contains(highlightElement)) {
        return;
      }

      const parent = highlightElement.parentNode;
      if (!parent) {
        return;
      }

      // Use replaceWith for safer DOM manipulation
      if (highlightElement.replaceWith) {
        // Modern approach - replace with all child nodes
        const children = Array.from(highlightElement.childNodes);
        highlightElement.replaceWith(...children);
      } else {
        // Fallback for older browsers
        const fragment = document.createDocumentFragment();
        while (highlightElement.firstChild) {
          fragment.appendChild(highlightElement.firstChild);
        }

        // Double-check parent relationship before removing
        if (highlightElement.parentNode === parent) {
          parent.insertBefore(fragment, highlightElement);
          parent.removeChild(highlightElement);
        }
      }

      // Normalize the parent to merge adjacent text nodes
      if (parent && parent.normalize) {
        parent.normalize();
      }
    } catch (error) {
      // Silently handle DOM errors to prevent console spam
      // console.error("Marky: Error unwrapping highlight:", error);
    }
  }

  // Import highlights from a JSON array
  async importHighlights(highlightsData) {
    try {
      await this.clearAllHighlights();
      await chrome.storage.local.set({ [this.storageKey]: highlightsData });
      await this.restoreHighlights();
    } catch (error) {
      console.error("Marky: Failed to import highlights:", error);
    }
  }

  // Clear all highlights from the page and from storage
  async clearAllHighlights() {
    document
      .querySelectorAll(".text-highlighter-highlight")
      .forEach((el) => this.unwrapHighlight(el));
    try {
      await chrome.storage.local.remove(this.storageKey);
      // console.log("Marky: All highlights cleared for this page.");
    } catch (error) {
      console.error("Marky: Error clearing highlights:", error);
    }
  }
}

// Ensure the script only initializes once
if (typeof window.markyHighlighter === "undefined") {
  window.markyHighlighter = new MarkyHighlighter();
  console.log("Marky: New highlighter instance created");
} else {
  console.log("Marky: Highlighter already exists");
}

console.log("Marky: Content script loaded"); // Re-enable for debugging
