/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        // serverActions: true,
        // serverComponentsExternalPackages: ["mongoose"],
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'lovely-flamingo-139.convex.cloud'
            },
            {
                protocol: 'https',
                hostname: 'encrypted-tbn0.gstatic.com'
            },
            {
                protocol: 'https',
                hostname: 'w7.pngwing.com'
            },
            {
                protocol: 'https',
                hostname: 'google.oit.ncsu.edu'
            },
            {
                protocol: 'https',
                hostname: 'podcraftr.vercel.app'
            },
            {
                protocol: 'https',
                hostname: 'a.thumbs.redditmedia.com'
            },
            {
                protocol: 'https',
                hostname: 'external-preview.redd.it'
            },
            {
                protocol: 'https',
                hostname: 'b.thumbs.redditmedia.com'
            },
            {
                protocol: 'https',
                hostname: 'storage.googleapis.com'
            },
            {
                protocol: 'https',
                hostname: 'sleek-capybara-771.convex.cloud'
            },
            {
                protocol: "https",
                hostname: "img.clerk.com",
            },
            {
                protocol: "https",
                hostname: "images.clerk.dev",
            },
            {
                protocol: "https",
                hostname: "uploadthing.com",
            },
            {
                protocol: "https",
                hostname: "utfs.io",
            },
            {
                protocol: "https",
                hostname: "placehold.co",
            },
        ],
    },
    typescript: {
        ignoreBuildErrors: true,
    },
};

export default nextConfig;
