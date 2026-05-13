"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { authService } from "../services/auth-service";

export const useAuth = (required = false) => {
  const router = useRouter();
  const [loading, setLoading] = useState(required);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const token = window.localStorage.getItem("mcips_token");

    if (!token) {
      if (required) {
        router.replace("/login");
      }
      setLoading(false);
      return;
    }

    authService
      .me()
      .then((response) => {
        setEmail(response.user.email);
      })
      .catch(() => {
        window.localStorage.removeItem("mcips_token");
        if (required) {
          router.replace("/login");
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [required, router]);

  return { loading, email };
};
