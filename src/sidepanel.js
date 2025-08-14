import { marked } from "./libs/marked.esm.js";
import * as status from "./status.js";

marked.use({
  renderer: {
    link({ tokens, href }) {
      const text = this.parser.parseInline(tokens);
      return `<a target="_blank" href="${href}">${text}</a>`;
    },
  },
});

class SidepanelController {
  constructor({ clientId, state }) {
    this.clientId = clientId;
    this.setupDomElements();
    this.setupEventListeners();
    this.update(state);
  }

  setupDomElements() {
    this.elements = {
      researchButton: document.getElementById("research-button"),
      researchContent: document.getElementById("research-content"),
      researchInput: document.getElementById("research-input"),
      researchDisclaimer: document.getElementById("research-disclaimer"),
      researchMeta: document.getElementById("research-meta"),
      tokensCount: document.getElementById("research-tokens-used"),
      setup: document.getElementById("setup"),
    };
  }

  setupEventListeners() {
    const { researchButton, researchInput, setup } = this.elements;

    chrome.runtime.onMessage.addListener((msg, sender) => {
      console.info("Received message in sidepanel:", msg.action);
      this.update(msg.state);
    });

    setup.addEventListener("click", async (event) => {
      event.preventDefault();
      chrome.runtime.openOptionsPage();
      return false;
    });

    researchInput.addEventListener("input", async (event) => {
      const state = await chrome.runtime.sendMessage({
        action: "set-state",
        state: {
          clientId: this.clientId,
          researchInputValue: event.target.value,
        },
      });
    });

    researchButton.addEventListener("click", async (event) => {
      event.preventDefault();

      const { researchInput } = this.elements;
      const searchString = researchInput.value.trim();

      // Get the app state from background worker
      console.info("Sending get-state", this.clientId);
      const state = await chrome.runtime.sendMessage({
        action: "get-state",
        clientId: this.clientId,
      });

      // If button clicked again while loading, send an abort message
      if (state.status === status.LOADING) {
        console.info("Sending abort..", this.clientId);
        const state = await chrome.runtime.sendMessage({
          action: "research-company-abort",
          clientId: this.clientId,
        });
        this.update(state);
      }
      // Start research
      else if (searchString !== "") {
        console.info("Sending research request", this.clientId, searchString);
        const { options } = await chrome.storage.local.get(["options"]);

        if (!options?.openAiApiKey) {
          console.warn("API key is not set. Opening options page.");
          chrome.runtime.openOptionsPage();
          return false;
        }

        const state = await chrome.runtime.sendMessage({
          action: "research-company",
          searchString: searchString,
          clientId: this.clientId,
          apiKey: options.openAiApiKey,
        });
        this.update(state);
      }
      return false;
    });
  }

  update(state) {
    const {
      researchButton,
      researchContent,
      researchMeta,
      tokensCount,
      researchInput,
    } = this.elements;

    // Set the default state
    researchInput.value = state.researchInputValue ?? "";
    researchInput.disabled = false;
    researchButton.value = "Go";
    researchContent.setAttribute("aria-busy", "false");
    researchMeta.style.display = "";

    switch (state.status) {
      case status.ERROR:
        researchContent.innerHTML = state.content;
        researchContent.style.display = "";
        break;
      case status.ERROR_MISSING_API_KEY:
        researchContent.innerHTML = state.content;
        researchContent.style.display = "";
        chrome.runtime.openOptionsPage();
        break;
      case status.LOADING:
        researchInput.disabled = true;
        researchContent.setAttribute("aria-busy", "true");
        researchContent.innerHTML = state.content;
        researchContent.style.display = "";
        researchButton.value = "Cancel";
        break;
      case status.ABORTED:
        researchContent.innerHTML = state.content;
        researchContent.style.display = "";
        break;
      case status.SUCCESS:
        researchContent.innerHTML = marked.parse(state.content ?? "");
        researchContent.style.display = "";
        tokensCount.innerHTML = `${state.tokens.total_tokens} tokens`;
        researchMeta.style.display = "block";
        break;
    }
  }
}

const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

console.info("Sending initial get-state", tabs[0].id);
const state = await chrome.runtime.sendMessage({
  action: "get-state",
  clientId: tabs[0].id,
});
console.info("Initializing SidepanelController.");
new SidepanelController({ clientId: tabs[0].id, state: state });
