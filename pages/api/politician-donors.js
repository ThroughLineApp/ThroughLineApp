import supabase from "../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const { politician_id, limit = 4 } = req.query;
  if (!politician_id) return res.status(400).json({ error: "politician_id required" });

  const { data, error } = await supabase
    .from("pac_donors")
    .select("pac_name, total_amount, dimension")
    .eq("politician_id", politician_id)
    .order("total_amount", { ascending: false })
    .limit(Number(limit));

  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ donors: data || [] });
}
