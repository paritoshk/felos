"use client";

import { C1Chat, ThemeProvider } from "@thesysai/genui-sdk";

export default function Home() {
  return (
    <ThemeProvider
      mode="dark"
      darkTheme={{
        interactiveAccent: "#3b82f6",
        interactiveAccentHover: "#2563eb",
        backgroundFills: "#030712",
        containerFills: "#111827",
      }}
    >
      <div className="h-screen">
        <C1Chat
          formFactor="full-page"
          apiUrl="/api/chat"
          agentName="Felous AI"
        />
      </div>
    </ThemeProvider>
  );
}
