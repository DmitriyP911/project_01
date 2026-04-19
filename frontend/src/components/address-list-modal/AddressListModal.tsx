import { useEffect } from "react";

import { AddressList } from "../address-list";
import styles from "./AddressListModal.module.css";

interface AddressListModalProps {
  onClose: () => void;
}

export const AddressListModal = ({ onClose }: AddressListModalProps): JSX.Element => {
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <button className={styles.closeBtn} type="button" aria-label="Закрити" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className={styles.body}>
          <AddressList />
        </div>
      </div>
    </div>
  );
};
