import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import supabase from "../../lib/supabase";

export default function AuthConfirm() {
  const router = useRouter();
  const [status, setStatus] = useState("Confirming your account...");

  useEffect(() => {
    if (!router.isReady) return;

    async function confirm() {
      const { token_hash, type } = router.query;

      if (!token_hash || !type) {
        setStatus("Invalid confirmation link. Please try signing up again.");
        return;
      }

      const { data, error } = await supabase.auth.verifyOtp({ token_hash, type });

      if (error) {
        setStatus("Confirmation failed: " + error.message);
        return;
      }

      const user = data?.user;
      if (user) {
        await supabase.from("profiles").upsert({
          id: user.id,
          email: user.email,
          quiz_level: 0,
          created_at: new Date().toISOString(),
        }, { onConflict: "id", ignoreDuplicates: true });
      }

      setStatus("Account confirmed! Redirecting...");
      router.push("/quiz");
    }

    confirm();
  }, [router.isReady, router.query]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0A0B0D",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      gap: 16,
    }}>
      <div style={{
        width: 40,
        height: 40,
        border: "3px solid #C9A84C",
        borderTopColor: "transparent",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
      <p style={{ color: "#9A9488", fontFamily: "Arial", fontSize: 15, textAlign: "center", padding: "0 24px" }}>
        {status}
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
