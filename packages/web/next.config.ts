import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // workspace 包通过 exports 暴露 TS 源码，需要 Next 参与编译
  transpilePackages: [
    "@quant-backtest/db",
    "@quant-backtest/engine",
    "@quant-backtest/shared",
    "@quant-backtest/strategies",
  ],
};

export default nextConfig;
