import { Researcher } from "./researcher.js";
import * as errors from "./errorcodes.js";

class BackgroundController {
  constructor({ researcher }) {
    this.researcher = researcher;
    this.requests = [];
    this.nextRequestId = 0;
    this.setupEventListeners();
  }

  setupEventListeners() {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      switch (msg.action) {
        case "get-requests":
          console.info(
            "Received get-requests command for client id: ",
            msg.clientId
          );
          // Get all requests matching the clientId
          const requests = this.requests.filter(
            (request) => request.clientId === msg.clientId
          );

          sendResponse({
            clientId: msg.clientId,
            requests: requests.map((r) => this.serializeRequest(r)),
          });
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
            sendResponse({
              error: error.ERROR_MISSING_API_KEY,
              data: "Missing API key.",
            });
            return false;
          } else {
            const request = this.researchCompany(
              msg.clientId,
              msg.apiKey,
              msg.searchString
            );
            sendResponse({
              clientId: msg.clientId,
              request: this.serializeRequest(request),
            });
            return false;
          }

        case "request-abort":
          console.info(
            "Received abort command",
            msg.clientId,
            msg.requestId,
            msg.searchString
          );

          // Find request by id
          const abortRequest = this.requests.find(
            (r) => r.id === msg.requestId
          );
          if (abortRequest) {
            abortRequest.controller.abort();
            this.requests = this.requests.filter(
              (r) => r.id !== abortRequest.id
            );
            sendResponse({
              clientId: msg.clientId,
              requestId: abortRequest.id,
              data: "Cancelled.",
            });
          } else {
            console.warn("No request found:", msg.requestId);
            sendResponse({
              clientId: msg.clientId,
              requestId: null,
              error: errors.ERROR_REQUEST_NOT_FOUND,
              data: "Request not found.",
            });
          }
          return false;
      }
    });

    chrome.action.onClicked.addListener(async (tab) => {
      await chrome.sidePanel.open({ tabId: tab.id });
    });
  }

  serializeRequest(request) {
    return {
      id: request.id,
    };
  }

  researchCompany(clientId, apiKey, searchString) {
    // If triggered from outside sidepanel, need to update the UI with the new search string

    const [promise, controller] = this.researcher.researchCompany(
      apiKey,
      searchString
    );
    const request = {
      id: ++this.nextRequestId,
      clientId,
      controller,
      error: null,
    };

    this.requests.push(request);

    chrome.runtime.sendMessage({
      action: "research-company-started",
      clientId: clientId,
      requestId: request.id,
      searchString: searchString,
    });
    promise
      .then((jsonData) => {
        // Save data to request object
        request.data = jsonData;

        // Send the response
        console.info("Sending research data to client", clientId);
        const ackMsg = chrome.runtime.sendMessage({
          action: "research-company-done",
          clientId: clientId,
          requestId: request.id,
          data: request.data,
        });
        // If ack is received then delete request
        if (ackMsg.ok) {
          this.requests.filter((r) => r !== request);
        }
      })
      .catch((e) => {
        if (e.name === "AbortError") {
          console.warn("Request was aborted by the user");
          return;
        }

        console.warn("Sending error info to client", clientId);

        const ackMsg = chrome.runtime.sendMessage({
          action: "research-company-done",
          clientId: clientId,
          requestId: request.id,
          data: e.message,
          error: errors.ERROR,
        });
        // If acknowledged, then remove the request.
        if (ackMsg.ok) {
          this.requests.filter((r) => r !== requestId);
        }
      });

    return request;
  }
}
console.info("Initializing BackgroundController.");
new BackgroundController({
  researcher: new Researcher(),
});
