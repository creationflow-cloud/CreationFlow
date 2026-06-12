import type { ConfigurationDto } from "../api/configurations.js";
import type { RenderJobDto } from "../api/render-jobs.js";

interface TopBarProps {
  readonly documentName: string;
  readonly hasDocument: boolean;
  readonly configuration: ConfigurationDto | null;
  readonly templateId: string | null;
  readonly dirty: boolean;
  readonly saving: boolean;
  readonly saveStatus: "idle" | "saved" | "error";
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly rendering: boolean;
  readonly renderJob: RenderJobDto | null;
  readonly renderError: string | null;
  readonly pdfOutput: { downloadUrl: string; filename: string } | null;
  readonly pdfPreviewUrl: string | null;
  readonly blockingIssues: number;
  readonly canGroup: boolean;
  readonly canUngroup: boolean;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  readonly onSave: () => void;
  readonly onRenderPdf: () => void;
  readonly onGroup: () => void;
  readonly onUngroup: () => void;
  readonly onSignOut?: () => void;
}

export function TopBar({
  documentName,
  hasDocument,
  configuration,
  templateId,
  dirty,
  saving,
  saveStatus,
  canUndo,
  canRedo,
  rendering,
  renderJob,
  renderError,
  pdfOutput,
  pdfPreviewUrl,
  blockingIssues,
  canGroup,
  canUngroup,
  onUndo,
  onRedo,
  onSave,
  onRenderPdf,
  onGroup,
  onUngroup,
  onSignOut,
}: TopBarProps) {
  const saveDisabled = !dirty || saving || blockingIssues > 0;
  const renderDisabled = rendering || saving || blockingIssues > 0;
  const blockHint =
    blockingIssues > 0
      ? `Save and render blocked: ${blockingIssues} mandatory rule violation(s).`
      : undefined;

  return (
    <header className="editor-header">
      <div className="header-brand">
        <p className="eyebrow">CreationFlow Editor</p>
        <h1>{hasDocument ? documentName : "Untitled document"}</h1>
      </div>

      <div className="header-actions">
        {hasDocument && (
          <>
            <button
              type="button"
              className="history-btn"
              disabled={!canUndo}
              onClick={onUndo}
              title="Undo (Ctrl+Z)"
            >
              Undo
            </button>
            <button
              type="button"
              className="history-btn"
              disabled={!canRedo}
              onClick={onRedo}
              title="Redo (Ctrl+Y)"
            >
              Redo
            </button>
            <button
              type="button"
              className="history-btn"
              disabled={!canGroup}
              onClick={onGroup}
              title="Group selection (Ctrl+G)"
            >
              Group
            </button>
            <button
              type="button"
              className="history-btn"
              disabled={!canUngroup}
              onClick={onUngroup}
              title="Ungroup (Ctrl+Shift+G)"
            >
              Ungroup
            </button>
            {blockingIssues > 0 && (
              <span className="dirty-indicator dirty" title={blockHint}>
                {blockingIssues} blocking rule violation{blockingIssues === 1 ? "" : "s"}
              </span>
            )}
            <span className={`dirty-indicator ${dirty ? "dirty" : "clean"}`}>
              {dirty ? "Unsaved changes" : saveStatus === "saved" ? "Saved" : "No changes"}
            </span>
            <button
              type="button"
              className={`save-btn ${saveStatus}`}
              disabled={saveDisabled}
              onClick={onSave}
              title={blockHint}
            >
              {saving
                ? "Saving..."
                : saveStatus === "saved"
                  ? "Saved"
                  : saveStatus === "error"
                    ? "Save failed"
                    : "Save"}
            </button>
            {configuration && (
              <button
                type="button"
                className="render-btn"
                disabled={renderDisabled}
                onClick={onRenderPdf}
                title={
                  blockHint ??
                  (dirty ? "Will save and render PDF" : "Render saved configuration to PDF")
                }
              >
                {rendering
                  ? "Rendering..."
                  : renderJob?.status === "done"
                    ? "PDF Ready"
                    : "Render PDF"}
              </button>
            )}
            {renderJob?.status === "done" && pdfOutput && (
              <a
                href={pdfPreviewUrl ?? pdfOutput.downloadUrl}
                className="render-download-link"
                target="_blank"
                rel="noopener noreferrer"
                title={`Download ${pdfOutput.filename}`}
              >
                {pdfOutput.filename}
              </a>
            )}
            {renderError && (
              <span className="render-error-badge" title={renderError}>
                Error
              </span>
            )}
          </>
        )}
        <span className="document-pill">
          {configuration
            ? `Config: ${configuration.id.slice(0, 8)}...`
            : templateId
              ? `Template: ${templateId.slice(0, 8)}...`
              : "No document"}
        </span>
        {onSignOut && (
          <button
            type="button"
            className="signout-btn"
            onClick={onSignOut}
            title="Clear stored API key"
          >
            Sign out
          </button>
        )}
      </div>
    </header>
  );
}
