// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "HodioPolitica - Policy Analysis Dashboard",
  description: "Análisis de impacto de políticas públicas con indicadores económicos",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, sans-serif" }}>{children}</body>
    </html>
  );
}
