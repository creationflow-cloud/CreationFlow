(function () {
  "use strict";

  function postHeightToParent() {
    var frame = document.querySelector(".creationflow-editor__frame");
    if (!frame) {
      return;
    }
    var height = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight
    );
    frame.style.height = height + "px";
  }

  function listenForMessages() {
    window.addEventListener("message", function (event) {
      if (!event || !event.data || typeof event.data !== "object") {
        return;
      }
      if (event.data.type === "creationflow:resize" && typeof event.data.height === "number") {
        var frame = document.querySelector(".creationflow-editor__frame");
        if (frame) {
          frame.style.height = event.data.height + "px";
        }
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      postHeightToParent();
      listenForMessages();
    });
  } else {
    postHeightToParent();
    listenForMessages();
  }
})();
