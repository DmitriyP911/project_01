import { useState, useEffect } from "react";

import { getAddresses, SavedAddress } from "../../api/addresses";
import { useMainContentContext } from "../../context/MainContentContext";

import styles from "./AddressList.module.css";

export const AddressList = (): JSX.Element => {
  const { refreshKey } = useMainContentContext();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    setLoading(true);
    setError(null);
    getAddresses()
      .then((res) => setAddresses(res.data.addresses))
      .catch(() => setError("Не вдалося завантажити адреси."))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const filtered = addresses.filter((a) =>
    a.address.toLowerCase().includes(filter.toLowerCase()),
  );

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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
