// Popup script for Marky Text Highlighter (v1.3.2)
class PopupManager {
  constructor() {
    this.colors = {
      yellow: { name: "Yellow", emoji: "🟡" },
      green: { name: "Green", emoji: "🟢" },
      blue: { name: "Blue", emoji: "🔵" },
      pink: { name: "Pink", emoji: "🟣" },
      orange: { name: "Orange", emoji: "🟠" },
    };
    this.init();
  }

  async init() {
    this.setupEventListeners();
    await this.updateHighlightStats();
  }

  setupEventListeners() {
    document
      .getElementById("export-btn")
      .addEventListener("click", () => this.exportHighlights());
    document
      .getElementById("import-btn")
      .addEventListener("click", () => this.importHighlights());
    document
      .getElementById("clear-btn")
      .addEventListener("click", () => this.clearAllHighlights());
    document
      .getElementById("file-input")
      .addEventListener("change", (e) => this.handleFileImport(e));
  }

  async getCurrentTab() {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    return tab;
  }

  getStorageKey(url) {
    let path = new URL(url).pathname;
    if (path.length > 1 && path.endsWith("/")) {
      path = path.slice(0, -1);
    }
    return `highlights_${new URL(url).origin}${path}`;
  }

  async updateHighlightStats() {
    const statsContainer = document.getElementById("stats-container");
    const loadingSpinner = document.getElementById("loading-spinner");

    // Show spinner while loading
    statsContainer.innerHTML = "";
    statsContainer.appendChild(loadingSpinner);
    loadingSpinner.style.display = "block";

    try {
      const tab = await this.getCurrentTab();
      if (!tab || !tab.url || tab.url.startsWith("chrome://")) {
        this.renderStats(null, "Marky cannot access this page.");
        return;
      }

      const storageKey = this.getStorageKey(tab.url);
      const result = await chrome.storage.local.get(storageKey);
      const highlights = result[storageKey] || [];
      this.renderStats(highlights);
    } catch (error) {
      console.error("Marky: Failed to update highlight stats:", error);
      this.renderStats(null, "Error loading stats.");
    }
  }

  renderStats(highlights, message = "No highlights on this page.") {
    const statsContainer = document.getElementById("stats-container");
    statsContainer.innerHTML = ""; // Clear spinner

    if (highlights === null || highlights.length === 0) {
      statsContainer.innerHTML = `<p class="no-highlights-message">${message}</p>`;
      return;
    }

    const totalCount = highlights.length;
    const colorCounts = {};
    highlights.forEach((h) => {
      const color = h.color || "yellow";
      colorCounts[color] = (colorCounts[color] || 0) + 1;
    });

    // Create total highlights element
    const totalEl = document.createElement("div");
    totalEl.className = "total-highlights";
    totalEl.innerHTML = `<div class="count">${totalCount}</div><div class="label">Total</div>`;

    // Create color stats grid
    const colorGridEl = document.createElement("div");
    colorGridEl.className = "color-stats-grid";

    const sortedColors = Object.keys(colorCounts).sort(
      (a, b) => colorCounts[b] - colorCounts[a]
    );
    sortedColors.forEach((color) => {
      const count = colorCounts[color];
      const info = this.colors[color] || { emoji: "❓" };
      const statEl = document.createElement("div");
      statEl.className = "color-stat";
      statEl.innerHTML = `<span class="color-stat-icon">${info.emoji}</span><span class="color-stat-count">${count}</span>`;
      colorGridEl.appendChild(statEl);
    });

    statsContainer.appendChild(totalEl);
    if (sortedColors.length > 0) {
      statsContainer.appendChild(colorGridEl);
    }
  }

  async exportHighlights() {
    try {
      const tab = await this.getCurrentTab();
      const storageKey = this.getStorageKey(tab.url);
      const result = await chrome.storage.local.get(storageKey);
      const highlights = result[storageKey] || [];

      if (highlights.length === 0) {
        this.showMessage("No highlights to export on this page.", "warning");
        return;
      }

      const exportData = {
        source: "Marky Text Highlighter",
        version: "1.2.3",
        url: tab.url,
        title: tab.title,
        exportDate: new Date().toISOString(),
        highlights: highlights,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `marky-highlights_${this.sanitizeFilename(tab.title)}_${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showMessage(
        `✅ Exported ${highlights.length} highlights successfully!`,
        "success"
      );
    } catch (error) {
      console.error("Failed to export highlights:", error);
      this.showMessage("❌ Failed to export highlights.", "error");
    }
  }

  importHighlights() {
    document.getElementById("file-input").click();
  }

  async handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.highlights || !Array.isArray(data.highlights)) {
        throw new Error("Invalid file format");
      }

      const tab = await this.getCurrentTab();

      // Inject script to handle import in content script
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (highlightsData) => {
          if (window.markyHighlighter) {
            window.markyHighlighter.importHighlights(highlightsData);
          }
        },
        args: [data.highlights],
      });

      await this.updateHighlightStats();
      this.showMessage(
        `✅ Imported ${data.highlights.length} highlights!`,
        "success"
      );
    } catch (error) {
      console.error("Failed to import highlights:", error);
      this.showMessage(
        "❌ Failed to import highlights. Please check the file format.",
        "error"
      );
    }

    // Reset file input
    event.target.value = "";
  }

  async clearAllHighlights() {
    const tab = await this.getCurrentTab();
    const storageKey = this.getStorageKey(tab.url);
    const result = await chrome.storage.local.get(storageKey);
    const highlights = result[storageKey] || [];

    if (highlights.length === 0) {
      this.showMessage("No highlights to clear on this page.", "info");
      return;
    }

    const confirmed = confirm(
      `Are you sure you want to remove all ${highlights.length} highlights from this page? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      // Inject script to clear highlights in content script
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          if (window.markyHighlighter) {
            window.markyHighlighter.clearAllHighlights();
          }
        },
      });

      await this.updateHighlightStats();
      this.showMessage("✅ All highlights cleared!", "success");
    } catch (error) {
      console.error("Failed to clear highlights:", error);
      this.showMessage("❌ Failed to clear highlights.", "error");
    }
  }

  sanitizeFilename(filename) {
    if (!filename) return "page";
    return filename.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  }

  showMessage(message, type, duration = 3000) {
    // Remove existing messages
    const existingMessages = document.querySelectorAll(".message");
    existingMessages.forEach((msg) => msg.remove());

    // Create message element
    const messageEl = document.createElement("div");
    messageEl.className = `message message-${type}`;
    messageEl.innerHTML = message;

    // Add to page
    document.body.appendChild(messageEl);

    // Remove after delay
    setTimeout(() => {
      if (messageEl.parentNode) {
        messageEl.parentNode.removeChild(messageEl);
      }
    }, duration);
  }
}

// Initialize popup when DOM loads
document.addEventListener("DOMContentLoaded", () => {
  new PopupManager();
});
