import styles from "./Footer.module.css";

export const Footer = (): JSX.Element => {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <span className={styles.copy}>© {year} MyApp. Все права защищены.</span>
        <nav className={styles.links}>
          <a href="#">Политика конфиденциальности</a>
          <a href="#">Условия использования</a>
          <a href="#">Поддержка</a>
        </nav>
      </div>
    </footer>
  );
};
