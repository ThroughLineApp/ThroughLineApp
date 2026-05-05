import "@/styles/globals.css";
import { AuthProvider, useAuth } from "../lib/auth";
import ZipBanner from "../components/ZipBanner";
import AuthModal from "../components/AuthModal";

function GlobalModals() {
  const { showAuthModal, setShowAuthModal } = useAuth();
  return showAuthModal ? (
    <AuthModal onDismiss={() => setShowAuthModal(false)} />
  ) : null;
}

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        ::-webkit-scrollbar { display: none; }
        * { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      <GlobalModals />
      <Component {...pageProps} />
    </AuthProvider>
  );
}