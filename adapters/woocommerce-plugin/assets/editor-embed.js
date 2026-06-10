(function () {
  "use strict";

  if (window.CreationFlowEmbedInitialized) {
    return;
  }
  window.CreationFlowEmbedInitialized = true;

  var config = window.CreationFlowEmbed || {};
  var i18n = config.i18n || {};
  var postMessageType = config.postMessageType || "creationflow:configuration-changed";

  function findFrame() {
    return document.querySelector(".creationflow-editor__frame");
  }

  function findContainer() {
    return document.querySelector(".creationflow-editor");
  }

  function findLoading() {
    return document.querySelector(".creationflow-editor__loading");
  }

  function findConfigurationInput() {
    return document.querySelector("input[name='creationflow_configuration_id']");
  }

  function findRequiredNotice() {
    return document.querySelector(".creationflow-config-required");
  }

  function findAddToCartForm() {
    return document.querySelector("form.cart");
  }

  function syncConfiguration(configId) {
    var input = findConfigurationInput();
    if (input) {
      input.value = configId || "";
    }
    var notice = findRequiredNotice();
    if (notice) {
      notice.hidden = !!configId;
    }
  }

  function handleAddToCartIntercept(event) {
    var input = findConfigurationInput();
    if (!input || input.value !== "") {
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    var frame = findFrame();
    if (frame && frame.contentWindow) {
      frame.contentWindow.postMessage({ type: "creationflow:request-configuration" }, "*");
    }
  }

  function attachAddToCartGuard() {
    var form = findAddToCartForm();
    if (!form) {
      return;
    }
    form.addEventListener("submit", handleAddToCartIntercept, true);
  }

  function handlePostMessage(event) {
    if (!event || !event.data || typeof event.data !== "object") {
      return;
    }
    if (event.data.type === "creationflow:resize" && typeof event.data.height === "number") {
      var frame = findFrame();
      if (frame) {
        frame.style.height = event.data.height + "px";
      }
      return;
    }
    if (event.data.type === postMessageType) {
      syncConfiguration(event.data.configurationId || event.data.configId || "");
    }
  }

  function postHeight() {
    var frame = findFrame();
    if (!frame) {
      return;
    }
    try {
      var doc = frame.contentDocument || frame.contentWindow.document;
      var body = doc.body;
      var html = doc.documentElement;
      var height = Math.max(
        body ? body.scrollHeight : 0,
        html ? html.scrollHeight : 0,
        body ? body.offsetHeight : 0,
        html ? html.offsetHeight : 0,
      );
      if (height > 0) {
        frame.style.height = height + "px";
      }
    } catch (error) {
      // Cross-origin restrictions may apply; ignore.
    }
  }

  function setupFrameLoad() {
    var frame = findFrame();
    if (!frame) {
      return;
    }
    var loading = findLoading();
    frame.addEventListener("load", function () {
      if (loading) {
        loading.style.display = "none";
      }
      postHeight();
    });
  }

  function setupResizeObserver() {
    if (typeof ResizeObserver === "undefined") {
      return;
    }
    var container = findContainer();
    if (!container) {
      return;
    }
    var observer = new ResizeObserver(function () {
      postHeight();
    });
    observer.observe(container);
  }

  function init() {
    if (!config.templateId) {
      return;
    }
    setupFrameLoad();
    setupResizeObserver();
    window.addEventListener("message", handlePostMessage);
    attachAddToCartGuard();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
