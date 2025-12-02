const config = {
  datasources: {
    db: {
      url: process.env.USE_SUPABASE === 'false'
        ? process.env.LOCAL_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/shadowcoders?schema=public'
        : process.env.DATABASE_URL || '',
      directUrl: process.env.DIRECT_URL,
    },
  },
}

export default config
