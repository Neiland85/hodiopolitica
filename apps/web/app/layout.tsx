// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "HodioPolitica \u2014 Modelado de Decisiones Pol\u00edticas",
  description: "Sistema de an\u00e1lisis y evaluaci\u00f3n de pol\u00edticas p\u00fablicas en Espa\u00f1a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          fontFamily: "'SF Mono', 'Fira Code', 'JetBrains Mono', 'Cascadia Code', monospace",
          background: "linear-gradient(145deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)",
          minHeight: "100vh",
          color: "#e2e8f0",
        }}
      >
        {children}
      </body>
    </html>
  );
}
