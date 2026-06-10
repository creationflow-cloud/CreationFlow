(function ($) {
  "use strict";

  if (typeof CreationFlowAdmin === "undefined") {
    return;
  }

  $(document).ready(function () {
    var settingsForm = $("form[action='options.php']");
    if (settingsForm.length === 0) {
      return;
    }

    settingsForm.on("submit", function () {
      var $button = settingsForm.find('input[name="submit"]');
      $button.prop("disabled", true);
      window.setTimeout(function () {
        $button.prop("disabled", false);
      }, 2000);
    });

    var $testButton = $("#creationflow-test-connection");
    if ($testButton.length === 0) {
      return;
    }

    var $status = $("<div></div>")
      .attr("id", "creationflow-test-status")
      .attr("role", "status")
      .attr("aria-live", "polite")
      .css({ "margin-top": "8px" });

    $testButton.after($status);

    $testButton.on("click", function (event) {
      event.preventDefault();

      $status
        .removeClass("notice notice-success notice-error notice-info")
        .addClass("notice notice-info")
        .text(CreationFlowAdmin.i18n.testing);

      $.post(CreationFlowAdmin.ajaxUrl, {
        action: "creationflow_test_connection",
        nonce: CreationFlowAdmin.testNonce,
      })
        .done(function (response) {
          if (response && response.success && response.data) {
            var data = response.data;
            if (data.ok) {
              $status
                .removeClass("notice-info notice-error")
                .addClass("notice-success")
                .text(data.message || CreationFlowAdmin.i18n.success);
            } else {
              $status
                .removeClass("notice-info notice-success")
                .addClass("notice-error")
                .text(data.message || CreationFlowAdmin.i18n.error);
            }
          } else if (response && response.data && response.data.message) {
            $status
              .removeClass("notice-info notice-success")
              .addClass("notice-error")
              .text(response.data.message);
          } else {
            $status
              .removeClass("notice-info notice-success")
              .addClass("notice-error")
              .text(CreationFlowAdmin.i18n.error);
          }
        })
        .fail(function (xhr) {
          var message = CreationFlowAdmin.i18n.error;
          if (xhr && xhr.responseJSON && xhr.responseJSON.data && xhr.responseJSON.data.message) {
            message = xhr.responseJSON.data.message;
          }
          $status.removeClass("notice-info notice-success").addClass("notice-error").text(message);
        });
    });
  });
})(jQuery);
