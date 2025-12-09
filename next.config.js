const withPWA = require("@ducanh2912/next-pwa").default({
    dest: "public",
    cacheOnFrontEndNav: true,
    aggressiveFrontEndNavCaching: true,
    reloadOnOnline: true,
    swcMinify: true,
    disable: false,
    workboxOptions: {
        disableDevLogs: true,
    },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "export",
    reactStrictMode: true,
    eslint: {
        ignoreDuringBuilds: true, // often helpful for migrations
    },
    // Static export doesn't support Image Optimization by default, so we need unoptimized images if using next/image
    images: {
        unoptimized: true,
    },
};

module.exports = withPWA(nextConfig);
