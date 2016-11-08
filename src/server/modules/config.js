module.exports = {
  server: {
    host: process.env.HOST,
    port: process.env.PORT || 8080,
    sessionSecret: process.env.SESSION_SECRET,
    processName: process.env.DYNO || process.env.NODE_ENV + '-' + (Math.random() * 10000).toString(32),
    jwt_secret: process.env.JWT_SECRET,
    apiBase: '/api',
    corsEnabled: false,
  },
  database: {
    dialect: "postgres",
    url: process.env.DATABASE_URL,
    redis_url: process.env.REDIS_URL
  },
  hashids: {
    hash_secret: {
      clip: process.env.HASH_SECRET_CLIP,
    },
    size: {
      clip: 8,
      channel: 16
    }
  },
  auth: {
    youtube: {
      clientID: process.env.SOCIAL_YOUTUBE_CLIENT_ID,
      clientSecret: process.env.SOCIAL_YOUTUBE_CLIENT_SECRET,
      callbackURL: '/auth/youtube/callback',
      api_key: process.env.SOCIAL_YOUTUBE_API_KEY,
      options: {
        //https://developers.google.com/identity/protocols/googlescopes
        scope: [
          'https://www.googleapis.com/auth/youtube.readonly',
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/userinfo.profile'
        ],
        authorizationParams: {
          access_type: 'online',
          approval_prompt: 'auto'
        }
      }
    },
    userCacheTime: 20000, //Milliseconds
    passwordSalt: process.env.PASSWORD_SALT,
    jwtSecret: process.env.JWT_SECRET,
    status: {
      banned: 0,
      notlogged: 1,
      user: 2,
      admin: 10000
    },
    successCallbackURL: '/auth/success',
    failureCallbackURL: '/auth/failure'
  },
  mixpanel: {
    token: process.env.MIXPANEL_TOKEN,
    api_secret: process.env.MIXPANEL_API_SECRET
  },
  raygun: {
    api_key: process.env.RAYGUN_APIKEY
  }
}