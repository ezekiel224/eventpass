"use client";

import { useCallback, useEffect, useState } from "react";

export function useCsrfToken() {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setError("");
    const response = await fetch("/api/auth/csrf", { cache: "no-store", credentials: "same-origin" });
    if (!response.ok) {
      setError("Could not initialize secure form protection.");
      return "";
    }
    const data = await response.json() as { token: string };
    setToken(data.token);
    return data.token;
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  return { token, error, refresh };
}
