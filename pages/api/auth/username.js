import { createClient } from "@supabase/supabase-js";

const USERNAME_RE = /^[a-zA-Z0-9_]+$/;

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { action, username } = req.body ?? {};

    if (
      typeof username !== "string" ||
      username.length < 3 ||
      username.length > 20 ||
      !USERNAME_RE.test(username)
    ) {
      return res.status(400).json({ error: "invalid_username" });
    }

    const supabase = serviceClient();

    if (action === "resolve") {
      const { data, error } = await supabase
        .from("profiles")
        .select("email")
        .ilike("username", username)
        .maybeSingle();

      if (error) throw error;
      if (!data || !data.email) {
        return res.status(404).json({ error: "not_found" });
      }
      return res.status(200).json({ email: data.email });
    }

    if (action === "check") {
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .ilike("username", username)
        .maybeSingle();

      if (error) throw error;
      return res.status(200).json({ available: !data });
    }

    return res.status(400).json({ error: "invalid_action" });

  } catch (err) {
    console.error("[api/auth/username]", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
}
