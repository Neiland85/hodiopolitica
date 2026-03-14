// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployments
  // output: 'standalone',

  /**
   * Turbopack monorepo stabilization.
   *
   * `root` tells Turbopack where the real monorepo root is,
   * preventing mis-detection when duplicate lockfiles appear
   * or when workspace packages import across app boundaries.
   *
   * @see https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack
   */
  turbopack: {
    root: path.join(__dirname, "..", ".."),
  },

  /**
   * Transpile workspace packages so Next.js compiles them
   * from source instead of expecting pre-built output.
   * Required for monorepo packages that ship raw TypeScript.
   */
  transpilePackages: ["@hodiopolitica/contracts"],
};

export default nextConfig;
