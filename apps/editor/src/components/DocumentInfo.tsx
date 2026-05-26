import type { ConfigurationDto } from "../api/configurations.js";
import type { ProductTemplateDto } from "../api/product-templates.js";

interface DocumentInfoProps {
  readonly configuration: ConfigurationDto | null;
  readonly template: ProductTemplateDto | null;
  readonly templateId: string | null;
  readonly loading: boolean;
  readonly configurationCreating: boolean;
  readonly error: string | null;
  readonly configurationError: string | null;
}

export function DocumentInfo({
  configuration,
  template,
  templateId,
  loading,
  configurationCreating,
  error,
  configurationError,
}: DocumentInfoProps) {
  return (
    <>
      <div className="property-card api-info-card">
        <h3>API Connection</h3>
        <div className="info-row">
          <span className="info-label">Configuration</span>
          <span className="info-value info-value-truncate">
            {configuration ? configuration.id : "not set"}
          </span>
        </div>
        <div className="info-row">
          <span className="info-label">Status</span>
          <span className="info-value info-status">
            {configuration ? configuration.status : "not loaded"}
          </span>
        </div>
      </div>

      {templateId && (
        <div className="property-card template-card">
          <h3>Template</h3>
          {(loading || configurationCreating) && <p className="template-status">Loading...</p>}
          {error && <p className="template-status template-error">{error}</p>}
          {template && !loading && !configurationCreating && (
            <div className="template-info">
              <div className="info-row">
                <span className="info-label">ID</span>
                <span className="info-value info-value-truncate">{template.id}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Workspace</span>
                <span className="info-value info-value-truncate">{template.workspaceId}</span>
              </div>
              {template.productId && (
                <div className="info-row">
                  <span className="info-label">Product</span>
                  <span className="info-value info-value-truncate">{template.productId}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {configuration && (
        <div className="property-card document-card">
          <h3>Document</h3>
          <div className="template-info">
            <div className="info-row">
              <span className="info-label">Configuration</span>
              <span className="info-value info-value-truncate">{configuration.id}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Status</span>
              <span className="info-value">{configuration.status}</span>
            </div>
            {template?.id && (
              <div className="info-row">
                <span className="info-label">Template</span>
                <span className="info-value info-value-truncate">{template.id}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {configurationError && (
        <div className="property-card error-card">
          <h3>Configuration Error</h3>
          <p className="template-status template-error">{configurationError}</p>
        </div>
      )}
    </>
  );
}
