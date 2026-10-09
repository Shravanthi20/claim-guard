import { useState } from "react";
import {
  signIn,
  signUp,
  confirmSignUp,
  signOut,
} from "aws-amplify/auth";
import { apiFetch } from "../services/api";

function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmationCode, setConfirmationCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSignIn = async () => {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      let result;
      try {
        result = await signIn({
          username: email,
          password,
        });
      } catch (err: unknown) {
        if (
          err &&
          typeof err === "object" &&
          "name" in err &&
          err.name === "UserAlreadyAuthenticatedException"
        ) {
          await signOut();
          result = await signIn({
            username: email,
            password,
          });
        } else {
          throw err;
        }
      }

      if (!result.isSignedIn) {
        setMessage("Additional authentication is required.");
        return;
      }

      // Sync Cognito user with PostgreSQL
      const response = await apiFetch("/users/me");

      if (!response.ok) {
        throw new Error("Failed to initialize user profile");
      }

      const user = await response.json();

      // Redirect according to database role
      if (user.role === "ADMIN") {
        window.location.href = "/admin";
      } else if (user.role === "INVESTIGATOR") {
        window.location.href = "/investigator";
      } else {
        window.location.href = "/customer";
      }
    } catch (err: unknown) {
      console.error("Login error:", err);
      setError(err instanceof Error ? err.message : "Login failed. Please check your email and password.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
  setLoading(true);
  setError("");
  setMessage("");

  try {
    // Clear any existing Cognito session
    try {
      await signOut();
    } catch {
      // Ignore if there was no active session
    }

    const result = await signUp({
      username: email,
      password,
      options: {
        userAttributes: {
          email,
          name,
        },
      },
    });

    if (result.nextStep.signUpStep === "CONFIRM_SIGN_UP") {
      setNeedsConfirmation(true);
      setMessage(
        "A confirmation code has been sent to your email."
      );
    } else {
      setMessage(
        "Account created successfully. You can now log in."
      );
      setIsSignUp(false);
    }
  } catch (err: unknown) {
    console.error("Sign-up error:", err);

    setError(err instanceof Error ? err.message : "Sign-up failed. Please check your details.");
  } finally {
    setLoading(false);
  }
};
  const handleConfirmSignUp = async () => {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      await confirmSignUp({
        username: email,
        confirmationCode,
      });

      setMessage(
        "Account confirmed successfully. You can now log in."
      );

      setNeedsConfirmation(false);
      setIsSignUp(false);
      setConfirmationCode("");
    } catch (err: unknown) {
      console.error("Confirmation error:", err);

      setError(err instanceof Error ? err.message : "Invalid confirmation code.");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsSignUp(!isSignUp);
    setNeedsConfirmation(false);
    setError("");
    setMessage("");
    setPassword("");
    setConfirmationCode("");
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>ClaimGuard <span>AI</span></h1>

        <p>
          Insurance Claim Investigation Platform
        </p>

        {needsConfirmation ? (
          <>
            <h2>Confirm Your Account</h2>

            <p className="muted">
              Enter the confirmation code sent to:
            </p>

            <p>
              <strong>{email}</strong>
            </p>

            <input
              type="text"
              placeholder="Confirmation code"
              value={confirmationCode}
              onChange={(e) =>
                setConfirmationCode(e.target.value)
              }
            />

            {error && <p className="alert error">{error}</p>}
            {message && <p className="form-message">{message}</p>}

            <button
              onClick={handleConfirmSignUp}
              disabled={loading}
              className="button"
            >
              {loading
                ? "Confirming..."
                : "Confirm Account"}
            </button>

            <button
              onClick={() => {
                setNeedsConfirmation(false);
                setIsSignUp(false);
                setError("");
                setMessage("");
              }}
              className="secondary-button"
            >
              Back to Login
            </button>
          </>
        ) : (
          <>
            <h2>
              {isSignUp ? "Create Account" : "Sign In"}
            </h2>

            {isSignUp && (
              <input
                type="text"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}

            {isSignUp && (
              <p className="muted" style={{ fontSize: "13px", marginBottom: "14px" }}>
                New accounts start as Customer. An administrator can grant Investigator access after registration.
              </p>
            )}

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {error && <p className="alert error">{error}</p>}
            {message && <p className="form-message">{message}</p>}

            <button
              onClick={
                isSignUp
                  ? handleSignUp
                  : handleSignIn
              }
              disabled={loading}
              className="button"
            >
              {loading
                ? "Please wait..."
                : isSignUp
                ? "Create Account"
                : "Sign In"}
            </button>

            <button
              onClick={switchMode}
              className="secondary-button"
            >
              {isSignUp
                ? "Already have an account? Sign In"
                : "Create a new account"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default Login;