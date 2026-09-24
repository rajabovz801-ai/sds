import type { NextConfig } from "next";
const nextConfig:NextConfig={reactStrictMode:true,poweredByHeader:false,serverExternalPackages:["pdfkit"],outputFileTracingIncludes:{"/api/telegram":["./node_modules/pdfkit/js/data/*.afm"]}};
export default nextConfig;
