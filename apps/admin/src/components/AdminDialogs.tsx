import { useEffect, useState } from "react";

import type { ProductDto } from "../api/products.js";

interface ProductEditDialogProps {
  readonly product: ProductDto;
  readonly onSave: (patch: { name: string; externalId: string | null }) => Promise<void>;
  readonly onCancel: () => void;
  readonly saving: boolean;
  readonly errorMessage: string | null;
}

export function ProductEditDialog({
  product,
  onSave,
  onCancel,
  saving,
  errorMessage,
}: ProductEditDialogProps) {
  const [name, setName] = useState(product.name);
  const [externalId, setExternalId] = useState(product.externalId ?? "");
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setName(product.name);
    setExternalId(product.externalId ?? "");
  }, [product.id, product.name, product.externalId]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      setValidationError("Name is required.");
      return;
    }
    if (trimmed.length > 200) {
      setValidationError("Name must be 200 characters or fewer.");
      return;
    }
    setValidationError(null);
    void onSave({ name: trimmed, externalId: externalId.trim() || null });
  }

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-edit-title"
    >
      <form className="modal-card" onSubmit={handleSubmit}>
        <h3 id="product-edit-title">Edit product</h3>
        <p className="modal-subtitle">
          ID <code>{product.id}</code>
        </p>
        <label className="form-label" htmlFor="product-edit-name">
          Name
        </label>
        <input
          id="product-edit-name"
          className="form-input"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoFocus
          required
        />
        <label className="form-label" htmlFor="product-edit-external">
          External ID (optional)
        </label>
        <input
          id="product-edit-external"
          className="form-input"
          type="text"
          value={externalId}
          onChange={(event) => setExternalId(event.target.value)}
          placeholder="e.g. wc-12345"
        />
        {validationError && <p className="form-error">{validationError}</p>}
        {errorMessage && <p className="form-error">{errorMessage}</p>}
        <div className="modal-actions">
          <button
            type="button"
            className="modal-cancel-btn"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="modal-confirm-btn"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

interface ConfirmDialogProps {
  readonly title: string;
  readonly message: string;
  readonly confirmLabel: string;
  readonly cancelLabel?: string;
  readonly busy?: boolean;
  readonly tone?: "default" | "danger";
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  busy = false,
  tone = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div
      className="modal-overlay"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="modal-card">
        <h3 id="confirm-dialog-title">{title}</h3>
        <p className="modal-subtitle">{message}</p>
        <div className="modal-actions">
          <button
            type="button"
            className="modal-cancel-btn"
            onClick={onCancel}
            disabled={busy}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`modal-confirm-btn ${tone === "danger" ? "danger" : ""}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
