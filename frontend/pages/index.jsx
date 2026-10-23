import dynamic from "next/dynamic";

const VirtualGlassesApp = dynamic(() => import("../components/VirtualGlassesApp"), {
  ssr: false,
  loading: () => (
    <main className="shell">
      <div className="card centerCard">Loading Virtual Glasses…</div>
    </main>
  ),
});

export default function Home() {
  return <VirtualGlassesApp />;
}
