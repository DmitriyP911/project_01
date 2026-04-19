import { useState } from "react";

import styles from "./BrandsTable.module.css";
import { FilteredBrand } from "../../api/addresses";

interface BrandsTableProps {
  brands: FilteredBrand[];
  onReset: () => void;
}

const pluralUk = (n: number, one: string, few: string, many: string): string => {
  if (n % 10 === 1 && n % 100 !== 11) return `${n} ${one}`;
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return `${n} ${few}`;
  return `${n} ${many}`;
};

export const BrandsTable = ({ brands, onReset }: BrandsTableProps): JSX.Element => {
  const [collapsedBrands, setCollapsedBrands] = useState<Set<number>>(new Set());

  const toggleBrand = (index: number): void => {
    setCollapsedBrands((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const totalRecipients = brands.reduce((sum, b) => sum + b.recipients.length, 0);

  return (
    <div className={styles.results}>
      <div className={styles.resultsHeader}>
        <span className={styles.resultsCount}>
          {pluralUk(brands.length, "бренд", "бренди", "брендів")}
          {" · "}
          {pluralUk(totalRecipients, "адреса", "адреси", "адрес")}
        </span>
        <button className={styles.resetBtn} onClick={onReset}>
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
              {brands.map((b, bi) => {
                const isCollapsed = !collapsedBrands.has(bi);
                return (
                  <>
                    <tr
                      key={`brand-${bi}`}
                      className={styles.trBrand}
                      onClick={() => toggleBrand(bi)}
                    >
                      <td className={`${styles.td} ${styles.tdBrand}`}>
                        <span
                          className={`${styles.chevron} ${isCollapsed ? styles.chevronCollapsed : ""}`}
                        >
                          ▾
                        </span>
                        {b.brand}
                      </td>
                      <td className={`${styles.td} ${styles.tdQty} ${styles.tdBrandQty}`}>
                        {b.quantity.toLocaleString("uk-UA")}
                        <span className={styles.brandAddressCount}>
                          {" / "}
                          {b.recipients.reduce((acc, r) => acc + r.quantity, 0)}
                        </span>
                      </td>
                    </tr>
                    {!isCollapsed &&
                      b.recipients.map((r, ri) => (
                        <tr key={`recipient-${bi}-${ri}`} className={styles.trRecipient}>
                          <td className={`${styles.td} ${styles.tdRecipient}`}>{r.recipient}</td>
                          <td className={`${styles.td} ${styles.tdQty}`}>
                            {r.quantity.toLocaleString("uk-UA")}
                          </td>
                        </tr>
                      ))}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
