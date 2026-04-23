import { createContext, useContext, useState, useEffect } from "react";
import supabase from "./supabase";

export const AuthContext = createContext({});
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMessage, setAuthMessage]     = useState(null);
  const [needsZip, setNeedsZip]           = useState(false);

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
          try {
            const fetchedProfile = await fetchOrCreateProfile(session.user);
            if (fetchedProfile && !fetchedProfile.zip_code) {
              setNeedsZip(true);
            }
          } catch (err) {
            console.error("Profile fetch failed:", err);
          } finally {
            setLoading(false);
          }
        } else {
          setProfile(null);
          setNeedsZip(false);
          setLoading(false);
        }
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
      const { data: newProfile, error: insertError } = await supabase
        .from("profiles")
        .insert({
          id: user.id,
          email: user.email,
          username: user.user_metadata?.username || null,
          quiz_level: 0,
          zip_code: null,
          followed_politicians: [],
          followed_issues: [],
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error("Profile insert error:", insertError);
        return null;
      }

      setProfile(newProfile);
      return newProfile;
    } else if (error) {
      console.error("fetchOrCreateProfile error:", error);
      setProfile(null);
      return null;
    } else {
      setProfile(data);
      return data;
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
    console.log("following slug:", slug);
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

  const refreshProfile = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    if (!error && data) setProfile(data);
  };

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      showAuthModal, setShowAuthModal,
      authMessage, setAuthMessage,
      requireAuth, signOut, refreshProfile,
      followPolitician, unfollowPolitician,
      followIssue, unfollowIssue,
      isFollowingPolitician, isFollowingIssue,
      needsZip, setNeedsZip,
      supabase,
    }}>
      {children}
    </AuthContext.Provider>
  );
}