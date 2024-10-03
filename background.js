chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({
    trelloApiKey: "",
    trelloToken: "",
    trelloBoardId: "",
  });
});
