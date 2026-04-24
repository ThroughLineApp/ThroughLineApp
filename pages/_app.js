import "@/styles/globals.css";
import { AuthProvider } from "../lib/auth";
import ZipBanner from "../components/ZipBanner";

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        ::-webkit-scrollbar { display: none; }
        * { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      <ZipBanner />
      <Component {...pageProps} />
    </AuthProvider>
  );
}