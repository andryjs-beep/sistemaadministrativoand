/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        domains: ['res.cloudinary.com'],
    },
    // Desactivar estrictamente para efectos secundarios de BCV si es necesario
    reactStrictMode: true,
};

module.exports = nextConfig;
