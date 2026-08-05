/** @type {import('next').NextConfig} */
const nextConfig = {
  // The published server URL is https://api.fitgap.org/v1 — keep the routes at
  // /api/v1 internally (Next's convention) and expose them without the stutter.
  async rewrites() {
    return [{ source: '/v1/:path*', destination: '/api/v1/:path*' }]
  },

  // The mock is called cross-origin by ReadMe's API explorer.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,PATCH,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Authorization,Content-Type' },
        ],
      },
    ]
  },
}
export default nextConfig
