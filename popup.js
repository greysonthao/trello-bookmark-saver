document.addEventListener("DOMContentLoaded", () => {
  const apiKeyInput = document.getElementById("apiKey");
  const tokenInput = document.getElementById("token");
  const boardIdInput = document.getElementById("boardId");
  const saveSettingsButton = document.getElementById("saveSettings");
  const saveBookmarkButton = document.getElementById("saveBookmark");
  const statusDiv = document.getElementById("status");

  function showStatus(message, isError = false) {
    statusDiv.textContent = message;
    statusDiv.className = isError ? "error" : "success";
    setTimeout(() => {
      statusDiv.textContent = "";
      statusDiv.className = "";
    }, 3000);
  }

  function validateInputs() {
    return (
      apiKeyInput.value.trim() !== "" &&
      tokenInput.value.trim() !== "" &&
      boardIdInput.value.trim() !== ""
    );
  }

  function updateSaveBookmarkButton() {
    saveBookmarkButton.disabled = !validateInputs();
  }

  // Load saved settings
  chrome.storage.sync.get(
    ["trelloApiKey", "trelloToken", "trelloBoardId"],
    (result) => {
      apiKeyInput.value = result.trelloApiKey || "";
      tokenInput.value = result.trelloToken || "";
      boardIdInput.value = result.trelloBoardId || "";
      updateSaveBookmarkButton();
    }
  );

  // Input validation
  [apiKeyInput, tokenInput, boardIdInput].forEach((input) => {
    input.addEventListener("input", updateSaveBookmarkButton);
  });

  // Save settings
  saveSettingsButton.addEventListener("click", () => {
    if (!validateInputs()) {
      showStatus("Please fill in all fields", true);
      return;
    }

    chrome.storage.sync.set(
      {
        trelloApiKey: apiKeyInput.value.trim(),
        trelloToken: tokenInput.value.trim(),
        trelloBoardId: boardIdInput.value.trim(),
      },
      () => {
        showStatus("Settings saved!");
        updateSaveBookmarkButton();
      }
    );
  });

  // Save bookmark to Trello
  saveBookmarkButton.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs[0];
      const name = currentTab.title;
      const url = currentTab.url;

      chrome.storage.sync.get(
        ["trelloApiKey", "trelloToken", "trelloBoardId"],
        (result) => {
          if (!validateInputs()) {
            showStatus(
              "Please set Trello API credentials and Board ID first",
              true
            );
            return;
          }

          const trelloUrl = `https://api.trello.com/1/cards?idList=${
            result.trelloBoardId
          }&key=${result.trelloApiKey}&token=${
            result.trelloToken
          }&name=${encodeURIComponent(name)}&desc=${encodeURIComponent(url)}`;

          fetch(trelloUrl, { method: "POST" })
            .then((response) => {
              if (!response.ok) {
                throw new Error("Network response was not ok");
              }
              return response.json();
            })
            .then((data) => {
              showStatus("Bookmark saved to Trello!");
            })
            .catch((error) => {
              console.error("Error:", error);
              showStatus(
                "Error saving bookmark. Please check your settings and try again.",
                true
              );
            });
        }
      );
    });
  });
});
