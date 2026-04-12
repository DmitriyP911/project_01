import styles from "./DashboardPage.module.css";
import { Footer } from "../../components/footer/Footer";
import { Header } from "../../components/header/Header";
import { MainContent } from "../../components/main-content";

export const DashboardPage = (): JSX.Element => (
  <div className={styles.layout}>
    <Header />
    <main className={styles.main}>
      <div className={styles.container}>
        <MainContent />
      </div>
    </main>
    <Footer />
  </div>
);
