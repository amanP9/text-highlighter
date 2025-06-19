// Content script for Marky Text Highlighter (v1.3.0)
console.log("Marky: Content script loading...");

class MarkyHighlighter {
  constructor() {
    this.storageKey = this.getStorageKey();
    this.isReady = false;
    this.init();
  }

  // Generate a normalized storage key for the current page
  getStorageKey() {
    let path = window.location.pathname;
    // Normalize path by removing trailing slash if it exists
    if (path.length > 1 && path.endsWith("/")) {
      path = path.slice(0, -1);
    }
    return `highlights_${window.location.origin}${path}`;
  }

  // Initialize the highlighter
  async init() {
    console.log("Marky: Initializing highlighter...");
    try {
      this.setupClickHandlers();
      await this.restoreHighlights();
      this.isReady = true;
      console.log("Marky: Highlighter is ready!");
    } catch (error) {
      console.error("Marky: Failed to initialize:", error);
    }
  }

  // Highlight the currently selected text
  highlightSelectedText(color = "yellow") {
    if (!this.isReady) {
      console.warn("Marky: Highlighter not ready yet, cannot highlight.");
      return;
    }

    const selection = window.getSelection();
    if (!selection.rangeCount || selection.isCollapsed) {
      console.log("Marky: No text selected to highlight.");
      return;
    }

    const range = selection.getRangeAt(0);
    // CRITICAL FIX: Do NOT trim the text content. Offsets rely on the raw text.
    const text = range.toString();

    if (!text.trim()) {
      console.log("Marky: Selection contains only whitespace.");
      return;
    }

    console.log(`Marky: Highlighting text with color: ${color}`);

    try {
      const highlightData = {
        id: `highlight_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`,
        text: text, // Save the raw text content
        color: color,
        startContainerXPath: this.getXPathForElement(range.startContainer),
        startOffset: range.startOffset,
        endContainerXPath: this.getXPathForElement(range.endContainer),
        endOffset: range.endOffset,
        timestamp: Date.now(),
      };

      this.applyHighlight(range, highlightData.id, color);
      this.saveHighlight(highlightData);
      selection.removeAllRanges();
    } catch (error) {
      console.error("Marky: Error applying highlight:", error);
    }
  }

  // Apply the visual span wrapper to a range
  applyHighlight(range, highlightId, color) {
    const span = document.createElement("span");
    span.className = `text-highlighter-highlight text-highlighter-${color}`;
    span.dataset.highlightId = highlightId;
    span.dataset.color = color;

    try {
      range.surroundContents(span);
    } catch (e) {
      const contents = range.extractContents();
      span.appendChild(contents);
      range.insertNode(span);
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
      console.log("Marky: Highlight saved.", highlightData);
    } catch (error) {
      console.error("Marky: Failed to save highlight:", error);
    }
  }

  // Restore all highlights from storage on page load
  async restoreHighlights() {
    try {
      const result = await chrome.storage.local.get(this.storageKey);
      const highlights = result[this.storageKey] || [];
      console.log(`Marky: Found ${highlights.length} highlights to restore.`);
      highlights.forEach((h) => this.recreateHighlight(h));
    } catch (error) {
      console.error("Marky: Failed to restore highlights:", error);
    }
  }

  // Recreate a single highlight on the page from stored data
  recreateHighlight(highlight) {
    try {
      const startElement = this.getElementByXPath(
        highlight.startContainerXPath
      );
      const endElement = this.getElementByXPath(highlight.endContainerXPath);

      if (!startElement || !endElement) {
        console.warn(
          "Marky: Could not find start/end nodes for highlight, skipping.",
          highlight
        );
        return;
      }

      const startNode = this.findTextNode(startElement, highlight.startOffset);
      const endNode = this.findTextNode(endElement, highlight.endOffset);

      if (!startNode || !endNode) {
        console.warn(
          "Marky: Could not find start/end text nodes for highlight, skipping.",
          highlight
        );
        return;
      }

      const range = document.createRange();
      range.setStart(startNode, highlight.startOffset);
      range.setEnd(endNode, highlight.endOffset);

      // Verify that the text content still matches
      if (range.toString() !== highlight.text) {
        console.warn("Marky: Text content has changed, skipping highlight.", {
          saved: highlight.text,
          current: range.toString(),
        });
        return;
      }

      this.applyHighlight(range, highlight.id, highlight.color || "yellow");
    } catch (error) {
      console.error("Marky: Failed to recreate highlight:", highlight, error);
    }
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

        if (confirm(`Remove this highlight?`)) {
          await this.removeHighlight(highlight.dataset.highlightId);
          this.unwrapHighlight(highlight);
        }
      }
    });
  }

  // Remove a highlight from storage by its ID
  async removeHighlight(highlightId) {
    try {
      const result = await chrome.storage.local.get(this.storageKey);
      let highlights = result[this.storageKey] || [];
      const initialCount = highlights.length;
      highlights = highlights.filter((h) => h.id !== highlightId);

      if (highlights.length < initialCount) {
        await chrome.storage.local.set({ [this.storageKey]: highlights });
        console.log(`Marky: Removed highlight ${highlightId}`);
      }
    } catch (error) {
      console.error("Marky: Error removing highlight:", error);
    }
  }

  // Remove the highlight span and restore the original DOM
  unwrapHighlight(highlightElement) {
    const parent = highlightElement.parentNode;
    while (highlightElement.firstChild) {
      parent.insertBefore(highlightElement.firstChild, highlightElement);
    }
    parent.removeChild(highlightElement);
    parent.normalize();
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
      console.log("Marky: All highlights cleared for this page.");
    } catch (error) {
      console.error("Marky: Error clearing highlights:", error);
    }
  }
}

// Ensure the script only initializes once
if (typeof window.markyHighlighter === "undefined") {
  window.markyHighlighter = new MarkyHighlighter();
}

console.log("Marky: Content script loaded");
