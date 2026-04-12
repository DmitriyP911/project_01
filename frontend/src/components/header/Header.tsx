import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import styles from "./Header.module.css";
import { useAuth } from "../../context/AuthContext";

export const Header = (): JSX.Element => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  const handleLogout = (): void => {
    logout();
    navigate("/login");
  };

  const toggleMenu = (): void => setMenuOpen((prev) => !prev);
  const closeMenu = (): void => setMenuOpen(false);

  // Закрыть попап при клике вне его
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };
    if (menuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  // Закрыть попап при смене ориентации / ресайзе выше брейкпоинта
  useEffect(() => {
    const handleResize = (): void => {
      if (window.innerWidth >= 768) closeMenu();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <span className={styles.logo}>MyApp</span>

        <div className={styles.userBlock}>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{user?.name}</span>
            <span className={styles.userEmail}>{user?.email}</span>
          </div>
          <div className={styles.avatar}>{user?.name?.charAt(0).toUpperCase()}</div>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            Выйти
          </button>
        </div>

        <div className={styles.burgerWrapper} ref={popupRef}>
          <button
            className={styles.burgerBtn}
            onClick={toggleMenu}
            aria-label="Меню"
            aria-expanded={menuOpen}
          >
            <span className={`${styles.bar} ${menuOpen ? styles.barTop : ""}`} />
            <span className={`${styles.bar} ${menuOpen ? styles.barMid : ""}`} />
            <span className={`${styles.bar} ${menuOpen ? styles.barBot : ""}`} />
          </button>

          {menuOpen && (
            <div className={styles.popup}>
              <div className={styles.popupAvatar}>{user?.name?.charAt(0).toUpperCase()}</div>
              <p className={styles.popupName}>{user?.name}</p>
              <p className={styles.popupEmail}>{user?.email}</p>
              <hr className={styles.divider} />
              <button className={styles.popupLogout} onClick={handleLogout}>
                Выйти
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
