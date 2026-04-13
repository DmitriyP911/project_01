import { useState, useRef, useCallback } from "react";

import styles from "./FileUpload.module.css";
import { uploadDocument, FilteredBrand } from "../../api/addresses";

const ACCEPTED_EXTENSIONS = [".xls", ".xlsx"];
const ACCEPTED_MIME = [
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const isValidFile = (file: File): boolean =>
  ACCEPTED_MIME.includes(file.type) ||
  ACCEPTED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));

const pluralUk = (n: number, one: string, few: string, many: string): string => {
  if (n % 10 === 1 && n % 100 !== 11) return `${n} ${one}`;
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return `${n} ${few}`;
  return `${n} ${many}`;
};

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

  const totalRecipients = brands?.reduce((sum, b) => sum + b.recipients.length, 0) ?? 0;

  console.log(brands);

  const total =
    brands?.reduce(
      (sum, b) => sum + b.recipients.reduce((recSum, r) => recSum + r.quantity, 0),
      0,
    ) ?? 0;

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

      {brands !== null && (
        <div className={styles.results}>
          <div className={styles.resultsHeader}>
            <span className={styles.resultsCount}>
              {pluralUk(brands.length, "бренд", "бренди", "брендів")}
              {" · "}
              {pluralUk(totalRecipients, "адреса", "адреси", "адрес")}
            </span>
            <button className={styles.resetBtn} onClick={handleReset}>
              Завантажити інший файл
            </button>
          </div>

          {brands.length === 0 ? (
            <p className={styles.empty}>Жоден рядок не відповідає збереженим брендам та адресам.</p>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>Бренд / Грузополучатель</th>
                    <th className={`${styles.th} ${styles.thQty}`}>
                      Кількість (в одиницях зберігання)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {brands.map((b, bi) => (
                    <>
                      <tr key={`brand-${bi}`} className={styles.trBrand}>
                        <td className={`${styles.td} ${styles.tdBrand}`}>{b.brand}</td>
                        <td className={`${styles.td} ${styles.tdQty} ${styles.tdBrandQty}`}>
                          {b.quantity.toLocaleString("uk-UA")}
                        </td>
                      </tr>
                      {b.recipients.map((r, ri) => (
                        <tr key={`recipient-${bi}-${ri}`} className={styles.trRecipient}>
                          <td className={`${styles.td} ${styles.tdRecipient}`}>{r.recipient}</td>
                          <td className={`${styles.td} ${styles.tdQty}`}>
                            {r.quantity.toLocaleString("uk-UA")}
                          </td>
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      <p>Total: {total}</p>
    </div>
  );
};
