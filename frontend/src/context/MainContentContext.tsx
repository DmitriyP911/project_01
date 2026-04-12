import { createContext, useContext, useState } from "react";

import { NominatimResult } from "../types/nominatim";

interface MainContentContextValue {
  addresses: NominatimResult[];
  addAddress: (address: NominatimResult) => void;
  removeAddress: (placeId: number) => void;
}

interface MainContentContextProviderProps {
  children: React.ReactNode;
}

const MainContentContext = createContext<MainContentContextValue | null>(null);

export const MainContentContextProvider = ({
  children,
}: MainContentContextProviderProps): JSX.Element => {
  const [addresses, setAddresses] = useState<NominatimResult[]>([]);

  const addAddress = (address: NominatimResult): void => {
    setAddresses((prev) => {
      if (prev.some((a) => a.place_id === address.place_id)) return prev;
      return [...prev, address];
    });
  };

  const removeAddress = (placeId: number): void => {
    setAddresses((prev) => prev.filter((a) => a.place_id !== placeId));
  };

  return (
    <MainContentContext.Provider value={{ addresses, addAddress, removeAddress }}>
      {children}
    </MainContentContext.Provider>
  );
};

export const useMainContentContext = (): MainContentContextValue => {
  const ctx = useContext(MainContentContext);
  if (!ctx) throw new Error("useMainContentContext must be used within MainContentContextProvider");
  return ctx;
};
