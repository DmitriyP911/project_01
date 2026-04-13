import axios from "axios";

export interface SavedAddress {
  _id: string;
  address: string;
}

export interface RecipientRow {
  recipient: string;
  quantity: number;
}

export interface FilteredBrand {
  brand: string;
  quantity: number;
  recipients: RecipientRow[];
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:5000/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const saveAddress = (address: string) =>
  api.post<{ addresses: SavedAddress[] }>("/addresses/my-addresses", { address });

export const getAddresses = () =>
  api.get<{ addresses: SavedAddress[] }>("/addresses/get-addresses");

export const uploadDocument = (file: File) => {
  const form = new FormData();
  form.append("file", file);
  return api.post<{ brands: FilteredBrand[] }>("/document", form);
};
