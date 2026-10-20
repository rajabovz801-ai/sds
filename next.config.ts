import type { NextConfig } from "next";
const securityHeaders=[
 {key:"X-Content-Type-Options",value:"nosniff"},
 {key:"X-Frame-Options",value:"DENY"},
 {key:"Referrer-Policy",value:"strict-origin-when-cross-origin"},
 {key:"Permissions-Policy",value:"camera=(), geolocation=(), payment=(), usb=()"}
];
const nextConfig:NextConfig={
 reactStrictMode:true,
 poweredByHeader:false,
 serverExternalPackages:["pdfkit"],
 outputFileTracingIncludes:{"/api/challenge-writing":["./public/writing/**/*","./public/images/mock/*writing*"],"/api/telegram":["./node_modules/pdfkit/js/data/*.afm"]},
 async headers(){return [{source:"/:path*",headers:securityHeaders}]}
};
export default nextConfig;
