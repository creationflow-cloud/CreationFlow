(function ($) {
  "use strict";

  var mappingConfig = window.CreationFlowMapping || {};
  var i18n = mappingConfig.i18n || {};

  function escapeHtml(value) {
    return $("<div>").text(value == null ? "" : value).html();
  }

  function renderResults($container, templates) {
    $container.empty();
    if (!templates || templates.length === 0) {
      $container.append('<p class="description">' + escapeHtml(i18n.noResults || "No templates found.") + "</p>");
      return;
    }

    var $list = $("<ul class=\"creationflow-template-results\"></ul>");
    templates.forEach(function (template) {
      var id = template.id || "";
      var name = template.name || id;
      var $item = $("<li></li>");
      var $button = $("<button type=\"button\" class=\"button button-secondary\"></button>")
        .text(name)
        .attr("data-template-id", id)
        .attr("data-template-name", name);
      $item.append($button);
      $item.append("<code>" + escapeHtml(id) + "</code>");
      $list.append($item);
    });
    $container.append($list);
  }

  function search($modal) {
    var workspaceId = $modal.find("input[name='workspace_id']").val() || "";
    var searchTerm = $modal.find("input[name='search']").val() || "";
    var $results = $modal.find(".creationflow-template-results-container");

    $results.html("<p>" + escapeHtml(i18n.loading || "Loading…") + "</p>");

    $.post(mappingConfig.ajaxUrl, {
      action: "creationflow_search_templates",
      nonce: mappingConfig.nonce,
      workspace_id: workspaceId,
      search: searchTerm,
    })
      .done(function (response) {
        if (response && response.success && response.data) {
          renderResults($results, response.data.templates || []);
        } else {
          $results.html(
            "<p class=\"creationflow-error\">" +
              escapeHtml((response && response.data && response.data.message) || i18n.error) +
              "</p>"
          );
        }
      })
      .fail(function () {
        $results.html("<p class=\"creationflow-error\">" + escapeHtml(i18n.error) + "</p>");
      });
  }

  function openModal(targetInput) {
    var $modal = $("#creationflow-template-modal");
    if ($modal.length === 0) {
      $modal = $(
        "<div id=\"creationflow-template-modal\" class=\"creationflow-modal\" style=\"display:none;\">" +
          "<div class=\"creationflow-modal__backdrop\"></div>" +
          "<div class=\"creationflow-modal__content\">" +
          "<h2>" + escapeHtml(i18n.title || "Pick a template") + "</h2>" +
          "<p><label>" + escapeHtml(i18n.workspaceLabel || "Workspace") + " <input type=\"text\" name=\"workspace_id\" /></label></p>" +
          "<p><label>" + escapeHtml(i18n.searchLabel || "Search") + " <input type=\"text\" name=\"search\" /></label> " +
          "<button type=\"button\" class=\"button creationflow-search-button\">" + escapeHtml(i18n.search || "Search") + "</button></p>" +
          "<div class=\"creationflow-template-results-container\"></div>" +
          "<p><button type=\"button\" class=\"button creationflow-modal-close\">" + escapeHtml(i18n.close || "Close") + "</button></p>" +
          "</div>" +
          "</div>"
      );
      $("body").append($modal);
      $modal.on("click", ".creationflow-modal-close, .creationflow-modal__backdrop", function () {
        $modal.hide();
      });
      $modal.on("click", ".creationflow-search-button", function () {
        search($modal);
      });
      $modal.on("click", ".creationflow-template-results button", function () {
        var $button = $(this);
        var $target = $(targetInput);
        $target.val($button.attr("data-template-id")).trigger("change");
        $modal.hide();
        validate_template($target);
      });
    }
    $modal.show();
    search($modal);
  }

  function validate_template($input) {
    var templateId = $input.val();
    if (!templateId) {
      $input.nextAll(".creationflow-template-status").first().text("");
      return;
    }
    var $status = $input.nextAll(".creationflow-template-status").first();
    $status.text(i18n.validating || "Validating…");
    $.post(mappingConfig.ajaxUrl, {
      action: "creationflow_validate_template",
      nonce: mappingConfig.nonce,
      template_id: templateId,
    })
      .done(function (response) {
        if (response && response.success && response.data) {
          $status.text(i18n.ok || "OK");
        } else {
          $status.text((response && response.data && response.data.message) || i18n.error);
        }
      })
      .fail(function () {
        $status.text(i18n.error);
      });
  }

  $(document).ready(function () {
    $(document).on("click", ".creationflow-search-template", function (event) {
      event.preventDefault();
      var targetSelector = $(this).attr("data-target");
      var $target = $("#" + targetSelector);
      if ($target.length) {
        openModal($target);
      }
    });

    $(document).on("change blur", "input[name='_creationflow_template_id']", function () {
      validate_template($(this));
    });
  });
})(jQuery);
