import { marked } from "./libs/marked.esm.js";
import * as errors from "./errorcodes.js";

const CLIENT_ID = "jobgpt-sidepanel";
const CLIENT_VERSION = "0.0.1";

const STATUS = {
  ERROR: -1,
  LOADING: 1,
  SUCCESS: 2,
  ABORTED: 3,
};

const DEFAULT_STATE = {
  content: "",
  status: STATUS.SUCCESS,
  tokens: null,
  error: null,
  searchString: "",
};

marked.use({
  renderer: {
    link({ tokens, href }) {
      const text = this.parser.parseInline(tokens);
      return `<a target="_blank" href="${href}">${text}</a>`;
    },
  },
});

class SidepanelController {
  constructor({ clientId, state, requests }) {
    this.clientId = clientId;
    this.requests = requests || [];
    this.state = {
      ...DEFAULT_STATE,
      ...(state || {}),
    };
    this.setupDomElements();
    this.setupEventListeners();

    this.update(this.state);
  }

  setupDomElements() {
    this.elements = {
      researchButton: document.getElementById("research-button"),
      researchContent: document.getElementById("research-content"),
      researchInput: document.getElementById("research-input"),
      researchMeta: document.getElementById("research-meta"),
      tokensCount: document.getElementById("research-tokens-used"),
      setup: document.getElementById("setup"),
    };
  }

  setupEventListeners() {
    const { researchButton, researchInput, setup } = this.elements;

    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      // Ignore if clientId doesn't match
      if (msg.clientId !== this.clientId) {
        return;
      }
      console.info("Received message in sidepanel:", msg.action);
      switch (msg.action) {
        case "research-company-done":
          sendResponse(sender, { ack: true });
          this.state.status = msg.error ? STATUS.ERROR : STATUS.SUCCESS;
          this.state.error = msg.error;
          this.state.content = msg.error
            ? msg.data
            : msg.data.choices[0].message.content;
          this.state.tokens = msg.error ? 0 : msg.data.usage;

          // Delete request
          this.requests = this.requests.filter(
            (request) => request.id !== msg.requestId
          );
          this.update(this.state);
          this.saveState(this.state).then(() => {});
          break;
      }
    });

    // Open the options dialog when setup button clicked
    setup.addEventListener("click", async (event) => {
      event.preventDefault();
      chrome.runtime.openOptionsPage();
      return false;
    });

    // Update the saved searchString as user types
    researchInput.addEventListener("input", async (event) => {
      const value = event.target.value.trim();
      this.state.searchString = value;
      await this.saveState(this.state);
    });

    // Run company search asynchronously
    researchButton.addEventListener("click", async (event) => {
      event.preventDefault();
      const { researchInput } = this.elements;
      const searchString = researchInput.value.trim();

      // If button clicked while in LOADING status, send an abort command
      if (this.state.status === STATUS.LOADING) {
        console.info("Sending abort..", this.clientId);
        const msg = await chrome.runtime.sendMessage({
          action: "request-abort",
          clientId: this.clientId,
          requestId: this.requests[0].id, // Sidepanel currently handles only a single request at atime
        });
        this.state.status = msg.error ? STATUS.ERROR : STATUS.ABORTED;
        this.state.error = msg.error;
        this.state.content = msg.data;

        // Delete the request
        if (!msg.error) {
          this.requests = this.requests.filter(
            (request) => request.id !== msg.requestId
          );
        }
        await this.saveState(this.state);
        this.update(this.state);
      }
      // Send command for company research
      else if (searchString !== "") {
        console.info("Sending research request", this.clientId, searchString);
        const { options } = await chrome.storage.local.get(["options"]);

        if (!options?.openAiApiKey) {
          console.warn("API key is not set. Opening options page.");
          chrome.runtime.openOptionsPage();
          return false;
        }

        const msg = await chrome.runtime.sendMessage({
          action: "research-company",
          searchString: searchString,
          clientId: this.clientId,
          apiKey: options.openAiApiKey,
        });
        // Save request so we can cancel it
        this.requests.push(msg.request);
        this.state.status = msg.error ? STATUS.ERROR : STATUS.LOADING;
        this.state.error = msg.error;
        this.state.content = msg.data;

        await this.saveState(this.state);
        this.update(this.state);
      }
      return false;
    });
  }

  async saveState(state) {
    console.info("Saving UI state to storage..");
    const key = `clientId_${this.clientId}`;
    return chrome.storage.local.set({
      [key]: {
        clientId: this.clientId,
        clientVersion: CLIENT_VERSION,
        updatedAt: new Date(),
        state: state,
      },
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
    researchInput.value = state.searchString ?? "";
    researchInput.disabled = false;
    researchButton.value = "Go";
    researchContent.setAttribute("aria-busy", "false");
    researchMeta.style.display = "";

    switch (state.status) {
      case STATUS.ERROR_MISSING_API_KEYERROR:
        researchContent.innerHTML = state.content;
        researchContent.style.display = "";

        if (state.error === errors.ERROR_MISSING_API_KEY) {
          researchContent.innerHTML =
            "Please add your OpenAI API key and try again.";
          researchContent.style.display = "";
          chrome.runtime.openOptionsPage();
        } else if (state.error === errors.ERROR) {
          researchContent.style.display = "";
          researchContent.innerHTML = state.content;
        }
        break;
      case STATUS.LOADING:
        researchInput.disabled = true;
        researchContent.setAttribute("aria-busy", "true");
        researchContent.innerHTML = "Please wait..";
        researchContent.style.display = "";
        researchButton.value = "Cancel";
        break;
      case STATUS.ABORTED:
        researchContent.innerHTML = state.content;
        researchContent.style.display = "";
        break;
      case STATUS.SUCCESS:
        researchContent.innerHTML = marked.parse(state.content ?? "");
        researchContent.style.display = "block";
        tokensCount.innerHTML = `${state.tokens?.total_tokens || 0} tokens`;
        if (state.content) {
          researchMeta.style.display = "block";
        }
        break;
    }
  }
}

console.info("Sending initial get-requests for client: ", CLIENT_ID);
const msg = await chrome.runtime.sendMessage({
  action: "get-requests",
  clientId: CLIENT_ID,
});

const key = `clientId_${CLIENT_ID}`;
const result = await chrome.storage.local.get(key);
const state = result?.[key]?.state || {};
console.info("Initializing SidepanelController.");
new SidepanelController({
  clientId: CLIENT_ID,
  requests: msg.requests,
  state: state,
});
