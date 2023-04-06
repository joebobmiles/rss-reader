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
  }
}

export default config
