// ✅ src/components/Layout.jsx - FIXED
import Footer from "./Footer";

export default function Layout({ children }) {
  return (
    <div className="layout-container">
      {/* ✅ Navbar removed - now only rendered in App.jsx */}
      <main className="layout-main">
        {children}
      </main>
      <Footer />
    </div>
  );
}