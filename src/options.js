class OptionsController {
  constructor({ options }) {
    this.setupDomElements({ options });
    this.setupEventListeners();
  }

  setupDomElements({ options }) {
    this.elements = {
      saveButton: document.getElementById("save-button"),
      apiKeyInput: document.getElementById("api-key-input"),
    };
    this.elements.apiKeyInput.value = options?.openAiApiKey ?? "";
  }

  setupEventListeners() {
    const { apiKeyInput, saveButton } = this.elements;

    saveButton.addEventListener("click", (event) => {
      event.preventDefault();
      const apiKey = apiKeyInput.value.trim();
      chrome.storage.local.set({
        options: { openAiApiKey: apiKey },
      });
      window.close();
    });
  }
}
const { options } = await chrome.storage.local.get(["options"]);
console.info("Initializing SidepanelController.");
new OptionsController({ options: options });
