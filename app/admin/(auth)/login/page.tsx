"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import gsap from "gsap";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const formRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tl = gsap.timeline();
    tl.from(logoRef.current, {
      opacity: 0,
      y: -30,
      duration: 0.6,
      ease: "power3.out",
    });
    tl.from(
      formRef.current,
      {
        opacity: 0,
        y: 30,
        duration: 0.5,
        ease: "power2.out",
      },
      "-=0.2"
    );
    return () => {
      tl.kill();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al iniciar sesión");
        toast.error(data.error || "Error al iniciar sesión");
        return;
      }

      toast.success("Sesión iniciada correctamente");
      router.push("/admin");
    } catch {
      setError("Error de conexión");
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-admin-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div ref={logoRef} className="text-center mb-8">
          <h1 className="text-4xl font-bold text-admin-gold tracking-wider">
            TOPSTORE
          </h1>
          <p className="text-admin-text-muted mt-2 text-sm tracking-wide">
            Panel de Administración
          </p>
        </div>

        <div
          ref={formRef}
          className="bg-admin-surface rounded-xl border border-admin-border p-8"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-admin-text-muted mb-2"
              >
                Usuario
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-admin-surface-2 border border-admin-border rounded-lg px-4 py-3 text-admin-text placeholder-admin-text-muted focus:outline-none focus:border-admin-gold transition-colors"
                placeholder="Ingresa tu usuario"
                required
                autoComplete="username"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-admin-text-muted mb-2"
              >
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-admin-surface-2 border border-admin-border rounded-lg px-4 py-3 text-admin-text placeholder-admin-text-muted focus:outline-none focus:border-admin-gold transition-colors"
                placeholder="Ingresa tu contraseña"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="bg-admin-danger/10 border border-admin-danger/30 rounded-lg px-4 py-3 text-sm text-admin-danger">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-admin-gold hover:bg-admin-gold-light text-admin-bg font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Verificando...
                </span>
              ) : (
                "INGRESAR"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
