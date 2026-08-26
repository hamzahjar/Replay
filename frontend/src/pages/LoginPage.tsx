import {
  useState,
  type FormEvent,
} from "react";

import {
  login,
  register,
} from "../services/api";

import { useAuth } from "../context/AuthContext";

function LoginPage() {
  const { refreshUser } = useAuth();

  const [mode, setMode] = useState<
    "login" | "register"
  >("login");

  const [displayName, setDisplayName] =
    useState("");

  const [email, setEmail] = useState("");

  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [error, setError] = useState("");

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  function switchMode(
    nextMode: "login" | "register",
  ) {
    setMode(nextMode);
    setError("");
    setPassword("");
    setConfirmPassword("");
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setIsSubmitting(true);

    try {
      if (mode === "register") {
        if (password !== confirmPassword) {
          throw new Error(
            "Passwords do not match.",
          );
        }

        await register(
          displayName,
          email,
          password,
        );

        await login({
          email,
          password,
        });
      } else {
        await login({
          email,
          password,
        });
      }

      await refreshUser();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : mode === "login"
            ? "Unable to sign in."
            : "Unable to create your account.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-branding">
        <img
          className="auth-logo"
          src="/assets/replay-logo.png"
          alt="Replay"
        />

        <p className="auth-tagline">
          Your AI conversations,
          <br />
          organized.
        </p>
      </section>

      <section className="auth-panel">
        <div className="auth-panel-inner">
          <div className="auth-header">
            <h1>
              {mode === "login"
                ? "Welcome back"
                : "Create your account"}
            </h1>

            <p>
              {mode === "login"
                ? "Sign in to continue to Replay."
                : "Start organizing your AI conversations."}
            </p>
          </div>

          <form
            className="auth-form"
            onSubmit={handleSubmit}
          >
            {mode === "register" && (
              <div className="form-field">
                <label htmlFor="display-name">
                  Name
                </label>

                <input
                  id="display-name"
                  type="text"
                  value={displayName}
                  onChange={(event) =>
                    setDisplayName(
                      event.target.value,
                    )
                  }
                  placeholder="Your name"
                  autoComplete="name"
                  required
                />
              </div>
            )}

            <div className="form-field">
              <label htmlFor="email">
                Email
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="password">
                Password
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value,
                  )
                }
                placeholder="Enter your password"
                autoComplete={
                  mode === "login"
                    ? "current-password"
                    : "new-password"
                }
                required
              />
            </div>

            {mode === "register" && (
              <div className="form-field">
                <label htmlFor="confirm-password">
                  Confirm Password
                </label>

                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(
                      event.target.value,
                    )
                  }
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                  required
                />
              </div>
            )}

            {error && (
              <p
                className="auth-error"
                role="alert"
              >
                {error}
              </p>
            )}

            <button
              className="auth-submit-button"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? mode === "login"
                  ? "Signing in..."
                  : "Creating account..."
                : mode === "login"
                  ? "Sign In"
                  : "Create Account"}
            </button>
          </form>

          <p className="auth-footer">
            {mode === "login"
              ? "Don't have an account?"
              : "Already have an account?"}{" "}
            <button
              type="button"
              className="auth-link"
              onClick={() =>
                switchMode(
                  mode === "login"
                    ? "register"
                    : "login",
                )
              }
            >
              {mode === "login"
                ? "Create account"
                : "Sign in"}
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}

export default LoginPage;