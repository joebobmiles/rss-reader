const config = {
  webpack: (
    config,
    _
  ) => {
    return {
      ...config,
      watchOptions: {
        ...config.watchOptions,
        poll: true
      }
    }
  },
  output: 'standalone'
}

export default config
