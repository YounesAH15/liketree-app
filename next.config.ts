import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig = {
    // 1. On autorise les images externes (YouTube et Spotify)
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: 'i.ytimg.com' },
            { protocol: 'https', hostname: 'i.scdn.co' },
            { protocol: 'https', hostname: 'mosaic.scdn.co' }, // Parfois utilisé par Spotify
            { protocol: 'https', hostname: 'lineup-images.scdn.co' },
        ],
    },
    // 2. On autorise notre IP locale "127.0.0.1" pour calmer le warning
    experimental: {
        serverActions: {
            allowedOrigins: ['127.0.0.1:3000', 'localhost:3000']
        }
    }
};

export default nextConfig;