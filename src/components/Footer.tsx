// src/components/Footer.tsx
export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-8 border-t border-slate-800 mt-auto">
      <div className="container mx-auto px-4 text-center text-sm">
        <p>&copy; {new Date().getFullYear()} NAFS Preparation Portal. All rights reserved.</p>
        <p className="mt-2">Empowering students and educators.</p>
      </div>
    </footer>
  );
}