import { useState, useEffect } from "react";

import { addBrand, getBrands, SavedBrand } from "../../api/brands";

import styles from "./SelectBrands.module.css";

export const SelectBrands = (): JSX.Element => {
  const [input, setInput] = useState("");
  const [brands, setBrands] = useState<SavedBrand[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getBrands()
      .then((res) => setBrands(res.data.brands))
      .catch(() => {});
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key !== " ") return;

    const value = input.trim();
    if (!value) {
      e.preventDefault();
      return;
    }

    e.preventDefault();

    const payload: SavedBrand = { brand: value, id: crypto.randomUUID() };

    setSaving(true);
    setError(null);

    addBrand(payload)
      .then((res) => {
        setBrands(res.data.brands);
        setInput("");
      })
      .catch(() => setError("Не вдалося зберегти бренд. Спробуйте ще раз."))
      .finally(() => setSaving(false));
  };

  return (
    <div className={styles.wrapper}>
      <label className={styles.label} htmlFor="brand-input">
        Додати бренд
      </label>

      <div className={styles.inputWrapper}>
        <input
          id="brand-input"
          className={`${styles.input} ${error ? styles.inputError : ""}`}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Введіть назву бренду та натисніть пробіл..."
          autoComplete="off"
          disabled={saving}
        />
        {saving && <span className={styles.spinner} aria-label="Збереження..." />}
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {brands.length > 0 && (
        <ul className={styles.chips} aria-label="Збережені бренди">
          {brands.map((b) => (
            <li key={b.id} className={styles.chip}>
              {b.brand}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
