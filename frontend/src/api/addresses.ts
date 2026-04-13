import axios from "axios";

export interface SavedAddress {
  _id: string;
  address: string;
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
