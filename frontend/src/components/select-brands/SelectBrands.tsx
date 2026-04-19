import { isAxiosError } from "axios";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

import styles from "./SelectBrands.module.css";
import { addBrand, getBrands, deleteBrand, SavedBrand } from "../../api/brands";

export const SelectBrands = (): JSX.Element => {
  const [input, setInput] = useState("");
  const [brands, setBrands] = useState<SavedBrand[]>([]);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    getBrands()
      .then((res) => setBrands(res.data.brands))
      .catch(() => {});
  }, []);

  const handleSubmit = (value: string): void => {
    const payload: SavedBrand = { brand: value, id: crypto.randomUUID() };

    setSaving(true);

    addBrand(payload)
      .then((res) => {
        setBrands(res.data.brands);
        setInput("");
        toast.success(`Бренд додано: ${value}`);
      })
      .catch((err: unknown) => {
        const message =
          isAxiosError(err) && err.response?.data?.message
            ? (err.response.data as { message: string }).message
            : "Не вдалося зберегти бренд. Спробуйте ще раз.";
        toast.error(message);
      })
      .finally(() => setSaving(false));
  };

  const handleDelete = (id: string, name: string): void => {
    setDeletingId(id);
    deleteBrand(id)
      .then((res) => {
        setBrands(res.data.brands);
        toast.success(`Бренд видалено: ${name}`);
      })
      .catch(() => toast.error("Не вдалося видалити бренд."))
      .finally(() => setDeletingId(null));
  };

  return (
    <div className={styles.wrapper}>
      <label className={styles.label} htmlFor="brand-input">
        Додати бренд
      </label>

      <div className={styles.inputWrapper}>
        <input
          id="brand-input"
          className={styles.input}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Введіть назву бренду"
          autoComplete="off"
          disabled={saving}
        />
        <button
          className={styles.addBtn}
          type="button"
          disabled={saving}
          onClick={() => handleSubmit(input)}
        >
          Додати бренд
        </button>
      </div>

      {brands.length > 0 && (
        <ul className={styles.chips} aria-label="Збережені бренди">
          {brands.map((b) => (
            <li key={b.id} className={styles.chip}>
              <span className={styles.chipText}>{b.brand}</span>
              <button
                className={styles.chipRemove}
                type="button"
                aria-label={`Видалити бренд ${b.brand}`}
                disabled={deletingId === b.id}
                onClick={() => handleDelete(b.id, b.brand)}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
