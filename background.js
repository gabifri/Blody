chrome.runtime.onInstalled.addListener(() => {
  // Supprime tout éventuel menu contextuel
  chrome.contextMenus.removeAll();
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-blody") {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'toggleBlodyShortcut' });
      }
    });
  }
});
