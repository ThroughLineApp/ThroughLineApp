import "@/styles/globals.css";
import { useState, useEffect, createContext, useContext } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ── Auth context — available everywhere in the app ────────────────────────────
export const AuthContext = createContext({});

export function useAuth() {
  return useContext(AuthContext);
}

function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMessage, setAuthMessage]     = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchOrCreateProfile(session.user);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchOrCreateProfile(session.user);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchOrCreateProfile = async (user) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error && error.code === "PGRST116") {
      const { data: newProfile } = await supabase
        .from("profiles")
        .insert({
          id: user.id,
          email: user.email,
          followed_politicians: [],
          followed_issues: [],
        })
        .select()
        .single();
      setProfile(newProfile);
    } else {
      setProfile(data);
    }
  };

  const requireAuth = (message) => {
    setAuthMessage(message || null);
    setShowAuthModal(true);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const followPolitician = async (slug) => {
    if (!user) { requireAuth("Sign in to follow politicians and get alerts."); return false; }
    const current = profile?.followed_politicians || [];
    if (current.includes(slug)) return true;
    const updated = [...current, slug];
    const { error } = await supabase.from("profiles").update({ followed_politicians: updated }).eq("id", user.id);
    if (!error) setProfile(p => ({ ...p, followed_politicians: updated }));
    return !error;
  };

  const unfollowPolitician = async (slug) => {
    if (!user) return false;
    const updated = (profile?.followed_politicians || []).filter(s => s !== slug);
    const { error } = await supabase.from("profiles").update({ followed_politicians: updated }).eq("id", user.id);
    if (!error) setProfile(p => ({ ...p, followed_politicians: updated }));
    return !error;
  };

  const followIssue = async (issue) => {
    if (!user) { requireAuth("Sign in to follow issues and get alerts."); return false; }
    const current = profile?.followed_issues || [];
    if (current.includes(issue)) return true;
    const updated = [...current, issue];
    const { error } = await supabase.from("profiles").update({ followed_issues: updated }).eq("id", user.id);
    if (!error) setProfile(p => ({ ...p, followed_issues: updated }));
    return !error;
  };

  const unfollowIssue = async (issue) => {
    if (!user) return false;
    const updated = (profile?.followed_issues || []).filter(i => i !== issue);
    const { error } = await supabase.from("profiles").update({ followed_issues: updated }).eq("id", user.id);
    if (!error) setProfile(p => ({ ...p, followed_issues: updated }));
    return !error;
  };

  const isFollowingPolitician = (slug) => profile?.followed_politicians?.includes(slug) || false;
  const isFollowingIssue = (issue) => profile?.followed_issues?.includes(issue) || false;

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      showAuthModal, setShowAuthModal,
      authMessage, setAuthMessage,
      requireAuth, signOut,
      followPolitician, unfollowPolitician,
      followIssue, unfollowIssue,
      isFollowingPolitician, isFollowingIssue,
      supabase,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
}