// Service worker for Marky Text Highlighter
console.log("Marky: Background script loaded (v1.3.0)");

const HIGHLIGHT_COLORS = {
  yellow: { name: "🟡 Yellow", icon: "🟡" },
  green: { name: "🟢 Green", icon: "🟢" },
  blue: { name: "🔵 Blue", icon: "🔵" },
  pink: { name: "🟣 Pink", icon: "🟣" },
  orange: { name: "🟠 Orange", icon: "🟠" },
};

// Create context menu when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  console.log("Marky: onInstalled event triggered.");
  chrome.contextMenus.create({
    id: "highlight-parent",
    title: "Highlight with Marky",
    contexts: ["selection"],
  });

  for (const [color, info] of Object.entries(HIGHLIGHT_COLORS)) {
    chrome.contextMenus.create({
      id: `highlight-${color}`,
      parentId: "highlight-parent",
      title: info.name,
      contexts: ["selection"],
    });
  }
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log("Marky: Context menu clicked:", info.menuItemId);
  const colorMatch = info.menuItemId.match(/highlight-(\w+)/);
  if (colorMatch && tab) {
    const color = colorMatch[1];
    highlightSelection(tab.id, color);
  }
});

// Handle keyboard commands
chrome.commands.onCommand.addListener((command, tab) => {
  console.log("Marky: Keyboard command received:", command);
  const commandMap = {
    "highlight-yellow": "yellow",
    "highlight-green": "green",
    "highlight-blue": "blue",
    "highlight-orange": "orange",
  };

  const color = commandMap[command];
  if (color && tab) {
    highlightSelection(tab.id, color);
  }
});

// Function to trigger highlighting in content script
async function highlightSelection(tabId, color = "yellow") {
  console.log(
    `Marky: Attempting to highlight with color '${color}' on tab ${tabId}`
  );
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (colorToUse) => {
        function tryHighlight(attemptsLeft) {
          if (window.markyHighlighter && window.markyHighlighter.isReady) {
            console.log("Marky: Content script is ready, highlighting now.");
            window.markyHighlighter.highlightSelectedText(colorToUse);
          } else if (attemptsLeft > 0) {
            console.log(
              `Marky: Content script not ready, retrying... (${attemptsLeft} attempts left)`
            );
            setTimeout(() => tryHighlight(attemptsLeft - 1), 100);
          } else {
            console.error(
              "Marky: Content script failed to initialize in time."
            );
            alert(
              "Marky could not apply the highlight because the page is still loading. Please try again in a moment."
            );
          }
        }
        tryHighlight(20); // Try for up to 2 seconds
      },
      args: [color],
    });
  } catch (e) {
    console.error(
      `Marky: Failed to execute script on tab ${tabId}. This might be a protected browser page.`,
      e
    );
  }
}
