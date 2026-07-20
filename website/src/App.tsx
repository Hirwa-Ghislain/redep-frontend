import { Splash } from "@/splash/Splash";
import { Nav } from "@/components/Nav";
import { Hero } from "@/sections/Hero";
import { Portals } from "@/sections/Portals";
import { Modules } from "@/sections/Modules";
import { Journeys } from "@/sections/Journeys";
import { RwandaFirst } from "@/sections/RwandaFirst";
import { Roadmap } from "@/sections/Roadmap";
import { Trust } from "@/sections/Trust";
import { CtaFooter } from "@/sections/CtaFooter";

export default function App() {
  return (
    <>
      {/* Renders once at the root, above all content; unmounts itself when done. */}
      <Splash />
      <Nav />
      <main>
        <Hero />
        <Portals />
        <Modules />
        <Journeys />
        <RwandaFirst />
        <Roadmap />
        <Trust />
        <CtaFooter />
      </main>
    </>
  );
}
