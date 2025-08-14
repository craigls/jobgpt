import { Researcher } from "./researcher.js";
import * as status from "./status.js";

class BackgroundController {
  constructor(researcher) {
    this.researcher = researcher;
    this.setupEventListeners();
    this.state = {};
    this.controllers = {};
  }

  setupEventListeners() {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      const { state, requests, controllers } = this;

      switch (msg.action) {
        case "get-state":
          console.info("Received get-state command", msg.clientId);
          sendResponse(state);
          return false;

        case "set-state":
          console.info("Received set-state command", msg.clientId, msg.state);
          Object.assign(state, msg.state);
          sendResponse(state);
          return false;

        case "research-company-abort":
          console.info(
            "Received abort command",
            msg.clientId,
            msg.searchString
          );
          controllers[state.clientId].abort();
          state.status = status.ABORTED;
          state.content = "Cancelled.";

          console.info("Aborted: Sending new state..", state.status);
          sendResponse(state);
          return false;

        // async
        case "research-company":
          console.info(
            "Received research command",
            msg.clientId,
            msg.searchString
          );

          // No OpenAI API key set!
          if (!msg.apiKey) {
            console.warn("No api key set.");
            state.status = status.ERROR_MISSING_API_KEY;
            state.content = "Please add your OpenAI API key and try again.";
            sendResponse(state);
            return false;
          } else {
            state.status = status.LOADING;
            state.content = "Please wait..";

            const controller = new AbortController();
            controllers[state.clientId] = controller;
            sendResponse(state);

            this.researcher
              .researchCompany(controller, msg.apiKey, msg.searchString)
              .then((jsonData) => {
                state.status = status.SUCCESS;
                state.tokens = jsonData.usage;
                state.content = jsonData.choices[0].message.content;

                console.info("Sending research data to client", state.clientId);
                chrome.runtime.sendMessage({
                  action: "research-company-success",
                  state: state,
                });
              })
              .catch((error) => {
                if (error.name === "AbortError") {
                  console.warn("Request was aborted by the user");
                  return;
                }
                state.status = status.ERROR;
                state.content = error.message;

                console.warn("Sending error info to client", state.clientId);
                chrome.runtime.sendMessage({
                  action: "research-company-error",
                  state: state,
                });
              });

            return false;
          }
        case "research-started":
        case "research-error":
          return false;
      }
    });

    chrome.action.onClicked.addListener(async (tab) => {
      await chrome.sidePanel.open({ tabId: tab.id });
    });
  }
}
const researcher = new Researcher();
console.info("Initializing BackgroundController.");
new BackgroundController(researcher);
