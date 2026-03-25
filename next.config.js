/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // We run lint manually; keep builds unblocked by legacy warnings.
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig