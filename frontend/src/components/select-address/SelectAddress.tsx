import { isAxiosError } from "axios";
import { useState, useRef } from "react";
import toast from "react-hot-toast";

import { AddressListModal } from "../address-list-modal";
import styles from "./SelectAddress.module.css";
import { NominatimResult } from "./SelectAddress.types";
import { saveAddress } from "../../api/addresses";
import { useMainContentContext } from "../../context/MainContentContext";

export const SelectAddress = (): JSX.Element => {
  const { triggerRefresh } = useMainContentContext();

  const [query, setQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const addedThisSession = useRef<Set<string>>(new Set());

  const handleSubmit = async (result: NominatimResult): Promise<void> => {
    try {
      await saveAddress(result.display_name);
      addedThisSession.current.add(result.display_name);
      triggerRefresh();
      setQuery("");
      toast.success(`Адресу додано: ${result.display_name}`);
    } catch (err) {
      const message =
        isAxiosError(err) && err.response?.data?.message
          ? (err.response.data as { message: string }).message
          : "Не вдалося зберегти адресу. Спробуйте ще раз.";
      toast.error(message);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setQuery(e.target.value);
  };

  return (
    <>
      <div className={styles.wrapper} ref={containerRef}>
        <div>
          <div className={styles.labelRow}>
            <label className={styles.label} htmlFor="address-input">
              Додати адресу
            </label>
          </div>

          <div className={styles.inputWrapper}>
            <input
              id="address-input"
              className={styles.input}
              type="text"
              value={query}
              onChange={handleChange}
              placeholder="Введіть адресу в Україні..."
            />
            <button
              className={styles.addBtn}
              type="button"
              onClick={() => void handleSubmit({ display_name: query } as NominatimResult)}
            >
              Додати адресу
            </button>
          </div>
        </div>

        <div>
          <button className={styles.viewAllBtn} type="button" onClick={() => setIsModalOpen(true)}>
            Дивитись всі адреси
          </button>
          {isModalOpen && <AddressListModal onClose={() => setIsModalOpen(false)} />}
        </div>
      </div>
    </>
  );
};
