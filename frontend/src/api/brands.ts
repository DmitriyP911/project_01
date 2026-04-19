import axios from "axios";

export interface SavedBrand {
  brand: string;
  id: string;
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:5000/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const addBrand = (payload: SavedBrand) =>
  api.post<{ brands: SavedBrand[] }>("/brands", payload);

export const getBrands = () => api.get<{ brands: SavedBrand[] }>("/brands");

export const deleteBrand = (id: string) =>
  api.delete<{ brands: SavedBrand[] }>("/brands/delete-brand", { data: { id } });
