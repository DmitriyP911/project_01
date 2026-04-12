import { useState, ChangeEvent, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { register } from "../../../api/auth";
import { RegisterPayload } from "../../../api/types";
import { useAuth } from "../../../context/AuthContext";
import styles from "../Auth.module.css";

export const RegisterPage = (): JSX.Element => {
  const { saveAuth } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<RegisterPayload>({ name: "", email: "", password: "" });
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
      const { data } = await register(form);
      saveAuth(data.token, data.user);
      navigate("/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Ошибка регистрации";
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
        <h1 className={styles.title}>Регистрация</h1>

        {error && <p className={styles.error}>{error}</p>}

        <label className={styles.label}>
          Имя
          <input
            className={styles.input}
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Иван Иванов"
            required
          />
        </label>

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
            placeholder="Минимум 6 символов"
            minLength={6}
            required
          />
        </label>

        <button className={styles.btn} type="submit" disabled={loading}>
          {loading ? "Создаём аккаунт..." : "Зарегистрироваться"}
        </button>

        <p className={styles.footer}>
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </p>
      </form>
    </div>
  );
};
