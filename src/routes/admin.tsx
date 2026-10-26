import { createFileRoute } from "@tanstack/react-router";
import { AdminPanel } from "@/game/AdminPanel";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Yönetici Paneli — Aden'in Masal Dünyası" },
      { name: "description", content: "Canlı oyuncu listesi, IP görüntüleme, oyuncu atma ve dev sinema kontrolü." },
    ],
  }),
  component: AdminRouteComponent,
});

function AdminRouteComponent() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <AdminPanel />
    </div>
  );
}
