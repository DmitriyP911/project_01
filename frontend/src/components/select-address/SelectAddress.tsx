import { useState, useEffect, useRef, useCallback } from "react";

import { saveAddress } from "../../api/addresses";
import { useMainContentContext } from "../../context/MainContentContext";

import styles from "./SelectAddress.module.css";
import { NominatimResult } from "./SelectAddress.types";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const DEBOUNCE_MS = 400;
const RESULTS_LIMIT = 10;

const fetchAddresses = async (query: string): Promise<NominatimResult[]> => {
  const params = new URLSearchParams({
    format: "json",
    countrycodes: "ua",
    limit: String(RESULTS_LIMIT),
    q: query,
  });

  const response = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
    headers: { "Accept-Language": "uk,en" },
  });

  if (!response.ok) throw new Error(`Nominatim error: ${response.status}`);

  const data: unknown = await response.json();

  if (!Array.isArray(data)) return [];

  return data.filter(
    (item): item is NominatimResult =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as Record<string, unknown>).place_id === "number" &&
      typeof (item as Record<string, unknown>).display_name === "string",
  );
};

export const SelectAddress = (): JSX.Element => {
  const { triggerRefresh } = useMainContentContext();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const addedThisSession = useRef<Set<string>>(new Set());

  const search = useCallback(async (value: string) => {
    if (value.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const data = await fetchAddresses(value);
      setResults(data);
      setOpen(true);
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        setError("Не вдалося завантажити адреси. Спробуйте ще раз.");
        setOpen(false);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      void search(query);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [query, search]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = async (result: NominatimResult): Promise<void> => {
    try {
      await saveAddress(result.display_name);
      addedThisSession.current.add(result.display_name);
      triggerRefresh();
      setQuery("");
      setResults([]);
      setOpen(false);
      setError(null);
    } catch {
      setError("Не вдалося зберегти адресу. Спробуйте ще раз.");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setQuery(e.target.value);
  };

  const handleClear = (): void => {
    setQuery("");
    setResults([]);
    setOpen(false);
    setError(null);
  };

  const isAlreadyAdded = (displayName: string): boolean =>
    addedThisSession.current.has(displayName);

  return (
    <div className={styles.wrapper} ref={containerRef}>
      <label className={styles.label} htmlFor="address-input">
        Додати адресу
      </label>

      <div className={styles.inputWrapper}>
        <input
          id="address-input"
          className={`${styles.input} ${error ? styles.inputError : ""}`}
          type="text"
          value={query}
          onChange={handleChange}
          placeholder="Введіть адресу в Україні..."
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls="address-listbox"
        />

        {loading && <span className={styles.spinner} aria-label="Завантаження..." />}

        {!loading && query && (
          <button className={styles.clearBtn} onClick={handleClear} aria-label="Очистити">
            ✕
          </button>
        )}
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {open && results.length > 0 && (
        <ul id="address-listbox" className={styles.dropdown} role="listbox">
          {results.map((result) => {
            const added = isAlreadyAdded(result.display_name);
            return (
              <li
                key={result.place_id}
                className={`${styles.option} ${added ? styles.optionAdded : ""}`}
                role="option"
                aria-selected={added}
                onMouseDown={() => {
                  if (!added) void handleSelect(result);
                }}
              >
                <span className={styles.optionText}>{result.display_name}</span>
                {added && <span className={styles.optionBadge}>✓ Додано</span>}
              </li>
            );
          })}
        </ul>
      )}

      {open && !loading && results.length === 0 && query.trim().length >= 2 && (
        <div className={styles.empty}>Адреси не знайдено</div>
      )}
    </div>
  );
};
