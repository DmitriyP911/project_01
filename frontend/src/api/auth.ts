import axios from "axios";

import { AuthResponse, RegisterPayload, LoginPayload, AuthUser } from "./types";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:5000/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const register = (data: RegisterPayload) => api.post<AuthResponse>("/auth/register", data);

export const login = (data: LoginPayload) => api.post<AuthResponse>("/auth/login", data);

export const getMe = () => api.get<{ user: AuthUser }>("/auth/me");
