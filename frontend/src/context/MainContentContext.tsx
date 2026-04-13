import { createContext, useContext, useState } from "react";

interface MainContentContextValue {
  refreshKey: number;
  triggerRefresh: () => void;
}

interface MainContentContextProviderProps {
  children: React.ReactNode;
}

const MainContentContext = createContext<MainContentContextValue | null>(null);

export const MainContentContextProvider = ({
  children,
}: MainContentContextProviderProps): JSX.Element => {
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = (): void => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <MainContentContext.Provider value={{ refreshKey, triggerRefresh }}>
      {children}
    </MainContentContext.Provider>
  );
};

export const useMainContentContext = (): MainContentContextValue => {
  const ctx = useContext(MainContentContext);
  if (!ctx) throw new Error("useMainContentContext must be used within MainContentContextProvider");
  return ctx;
};
