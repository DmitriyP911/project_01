import { MainContentContextProvider } from "../../context/MainContentContext";
import { AddressList } from "../address-list";
import { FileUpload } from "../file-upload";
import { SelectAddress } from "../select-address";
import styles from "./MainContent.module.css";

export const MainContent = (): JSX.Element => (
  <MainContentContextProvider>
    <section className={styles.section}>
      <h1 className={styles.title}>Дашборд</h1>
      <FileUpload />
      <SelectAddress />
      <AddressList />
    </section>
  </MainContentContextProvider>
);
