import { useState, ChangeEvent, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { login } from "../../../api/auth";
import { LoginPayload } from "../../../api/types";
import { useAuth } from "../../../context";
import styles from "../Auth.module.css";

export const LoginPage = (): JSX.Element => {
  const { saveAuth } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<LoginPayload>({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data } = await login(form);
      saveAuth(data.token, data.user);

      navigate("/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Ошибка входа";
      setError(
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? message,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <h1 className={styles.title}>Вход</h1>

        {error && <p className={styles.error}>{error}</p>}

        <label className={styles.label}>
          Email
          <input
            className={styles.input}
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="you@example.com"
            required
          />
        </label>

        <label className={styles.label}>
          Пароль
          <input
            className={styles.input}
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="••••••••"
            required
          />
        </label>

        <button className={styles.btn} type="submit" disabled={loading}>
          {loading ? "Входим..." : "Войти"}
        </button>

        <p className={styles.footer}>
          Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
        </p>
      </form>
    </div>
  );
};
