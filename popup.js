// popup.js
document.addEventListener("DOMContentLoaded", () => {
  const apiKeyInput = document.getElementById("apiKey");
  const tokenInput = document.getElementById("token");
  const boardIdInput = document.getElementById("boardId");
  const saveSettingsButton = document.getElementById("saveSettings");
  const saveBookmarkButton = document.getElementById("saveBookmark");
  const statusDiv = document.getElementById("status");
  const debugDiv = document.getElementById("debug");

  function showStatus(message, isError = false) {
    statusDiv.textContent = message;
    statusDiv.className = isError ? "error" : "success";
    setTimeout(() => {
      statusDiv.textContent = "";
      statusDiv.className = "";
    }, 5000);
  }

  function showDebug(message) {
    debugDiv.textContent += message + "\n";
    console.log(message);
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
      showDebug("Settings loaded from storage");
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
        showDebug("Settings saved to storage");
      }
    );
  });

  // Save bookmark to Trello
  saveBookmarkButton.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs[0];
      const name = currentTab.title;
      const url = currentTab.url;

      showDebug(`Attempting to save: ${name} - ${url}`);

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

          showDebug(`Sending request to: ${trelloUrl}`);

          fetch(trelloUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          })
            .then((response) => {
              showDebug(`Response status: ${response.status}`);
              if (!response.ok) {
                return response.text().then((text) => {
                  throw new Error(
                    `HTTP error! status: ${response.status}, message: ${text}`
                  );
                });
              }
              return response.json();
            })
            .then((data) => {
              showStatus("Bookmark saved to Trello!");
              showDebug(`Success! Card created with ID: ${data.id}`);
            })
            .catch((error) => {
              console.error("Error:", error);
              showStatus(`Error saving bookmark: ${error.message}`, true);
              showDebug(`Error details: ${error.stack}`);
            });
        }
      );
    });
  });

  // Add a test connection button
  const testConnectionButton = document.createElement("button");
  testConnectionButton.textContent = "Test Connection";
  testConnectionButton.addEventListener("click", () => {
    const apiKey = apiKeyInput.value.trim();
    const token = tokenInput.value.trim();
    const boardId = boardIdInput.value.trim();

    if (!apiKey || !token || !boardId) {
      showStatus("Please fill in all fields before testing", true);
      return;
    }

    const testUrl = `https://api.trello.com/1/boards/${boardId}?key=${apiKey}&token=${token}`;

    showDebug(`Testing connection: ${testUrl}`);

    fetch(testUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        showStatus(`Connection successful! Board name: ${data.name}`);
        showDebug(`Board details: ${JSON.stringify(data, null, 2)}`);
      })
      .catch((error) => {
        showStatus(`Connection failed: ${error.message}`, true);
        showDebug(`Connection test error: ${error.stack}`);
      });
  });

  document.body.appendChild(testConnectionButton);

  // Clear debug log button
  const clearDebugButton = document.createElement("button");
  clearDebugButton.textContent = "Clear Debug Log";
  clearDebugButton.addEventListener("click", () => {
    debugDiv.textContent = "";
  });
  document.body.appendChild(clearDebugButton);
});
