import { useState, useEffect } from "react";

import styles from "./AddressList.module.css";
import { getAddresses, deleteAddress, SavedAddress } from "../../api/addresses";
import { useMainContentContext } from "../../context/MainContentContext";

export const AddressList = (): JSX.Element => {
  const { refreshKey } = useMainContentContext();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getAddresses()
      .then((res) => setAddresses(res.data.addresses))
      .catch(() => setError("Не вдалося завантажити адреси."))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const handleDelete = (id: string): void => {
    setDeletingId(id);
    deleteAddress(id)
      .then((res) => setAddresses(res.data.addresses))
      .catch(() => setError("Не вдалося видалити адресу."))
      .finally(() => setDeletingId(null));
  };

  const filtered = addresses.filter((a) => a.address.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          Вибрані адреси
          {addresses.length > 0 && <span className={styles.count}>{addresses.length}</span>}
        </h2>

        {addresses.length > 0 && (
          <input
            className={styles.filterInput}
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Фільтр по адресі..."
            aria-label="Фільтр адрес"
          />
        )}
      </div>

      {loading && <p className={styles.empty}>Завантаження...</p>}

      {error && <p className={styles.empty}>{error}</p>}

      {!loading && !error && addresses.length === 0 && (
        <p className={styles.empty}>Ще немає вибраних адрес. Скористайтесь пошуком вище.</p>
      )}

      {!loading && !error && addresses.length > 0 && filtered.length === 0 && (
        <p className={styles.empty}>Нічого не знайдено за фільтром «{filter}».</p>
      )}

      {!loading && filtered.length > 0 && (
        <ul className={styles.list}>
          {filtered.map((a) => (
            <li key={a._id} className={styles.item}>
              <span className={styles.itemText}>{a.address}</span>
              <button
                className={styles.removeBtn}
                type="button"
                aria-label="Видалити адресу"
                disabled={deletingId === a._id}
                onClick={() => handleDelete(a._id)}
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
