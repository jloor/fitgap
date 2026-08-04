/** @type {import('next').NextConfig} */
const nextConfig = {
  // The mock is called cross-origin by ReadMe's API explorer.
  async headers() {
    return [
      {
        source: '/api/:path*',
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
