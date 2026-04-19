import { createContext, useContext, useState, useEffect } from "react";

import { getAddresses, SavedAddress } from "../api/addresses";

interface MainContentContextValue {
  addresses: SavedAddress[];
  addressesLoading: boolean;
  addressesError: string | null;
  setAddresses: (addresses: SavedAddress[]) => void;
}

interface MainContentContextProviderProps {
  children: React.ReactNode;
}

const MainContentContext = createContext<MainContentContextValue | null>(null);

export const MainContentContextProvider = ({
  children,
}: MainContentContextProviderProps): JSX.Element => {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [addressesError, setAddressesError] = useState<string | null>(null);

  useEffect(() => {
    getAddresses()
      .then((res) => setAddresses(res.data.addresses))
      .catch(() => setAddressesError("Не вдалося завантажити адреси."))
      .finally(() => setAddressesLoading(false));
  }, []);

  return (
    <MainContentContext.Provider
      value={{ addresses, addressesLoading, addressesError, setAddresses }}
    >
      {children}
    </MainContentContext.Provider>
  );
};

export const useMainContentContext = (): MainContentContextValue => {
  const ctx = useContext(MainContentContext);
  if (!ctx) throw new Error("useMainContentContext must be used within MainContentContextProvider");
  return ctx;
};
