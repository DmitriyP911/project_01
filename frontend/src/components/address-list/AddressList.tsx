import { useState } from "react";

import { useMainContentContext } from "../../context/MainContentContext";

import styles from "./AddressList.module.css";

export const AddressList = (): JSX.Element => {
  const { addresses, removeAddress } = useMainContentContext();
  const [filter, setFilter] = useState("");

  const filtered = addresses.filter((a) =>
    a.display_name.toLowerCase().includes(filter.toLowerCase()),
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

      {addresses.length === 0 && (
        <p className={styles.empty}>Ще немає вибраних адрес. Скористайтесь пошуком вище.</p>
      )}

      {addresses.length > 0 && filtered.length === 0 && (
        <p className={styles.empty}>Нічого не знайдено за фільтром «{filter}».</p>
      )}

      {filtered.length > 0 && (
        <ul className={styles.list}>
          {filtered.map((address) => (
            <li key={address.place_id} className={styles.item}>
              <span className={styles.itemText}>{address.display_name}</span>
              <button
                className={styles.removeBtn}
                onClick={() => removeAddress(address.place_id)}
                aria-label={`Видалити ${address.display_name}`}
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
