import { useState, useRef, useCallback } from "react";

import { uploadDocument, FilteredBrand } from "../../api/addresses";
import { BrandsTable } from "../brands-table";
import styles from "./FileUpload.module.css";

const ACCEPTED_EXTENSIONS = [".xls", ".xlsx"];
const ACCEPTED_MIME = [
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const isValidFile = (file: File): boolean =>
  ACCEPTED_MIME.includes(file.type) ||
  ACCEPTED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));

export const FileUpload = (): JSX.Element => {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brands, setBrands] = useState<FilteredBrand[] | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File): Promise<void> => {
    if (!isValidFile(file)) {
      setError("Підтримуються лише файли .xls та .xlsx");
      return;
    }
    setFileName(file.name);
    setUploading(true);
    setError(null);
    setBrands(null);
    try {
      const res = await uploadDocument(file);
      setBrands(res.data.brands);
    } catch {
      setError("Не вдалося обробити файл. Спробуйте ще раз.");
    } finally {
      setUploading(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>): void => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) void processFile(file);
    },
    [processFile],
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setDragging(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) void processFile(file);
    e.target.value = "";
  };

  const handleReset = (): void => {
    setBrands(null);
    setFileName(null);
    setError(null);
  };

  return (
    <div className={styles.wrapper}>
      <label className={styles.label}>Завантажити документ</label>

      <div
        className={[
          styles.dropzone,
          dragging ? styles.dropzoneActive : "",
          uploading ? styles.dropzoneUploading : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => {
          if (!uploading) inputRef.current?.click();
        }}
        role="button"
        tabIndex={0}
        aria-label="Завантажити XLS або XLSX файл"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xls,.xlsx"
          className={styles.hiddenInput}
          onChange={handleInputChange}
          tabIndex={-1}
        />

        {uploading ? (
          <div className={styles.uploadingState}>
            <span className={styles.spinner} aria-label="Завантаження..." />
            <p className={styles.dropzoneHint}>Обробка {fileName}…</p>
          </div>
        ) : (
          <div className={styles.idleState}>
            <svg
              className={styles.icon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
              />
            </svg>
            <p className={styles.dropzoneText}>Перетягніть XLS/XLSX файл сюди</p>
            <p className={styles.dropzoneHint}>
              або <span className={styles.browse}>натисніть для вибору</span>
            </p>
          </div>
        )}
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {brands !== null && <BrandsTable brands={brands} onReset={handleReset} />}
    </div>
  );
};
