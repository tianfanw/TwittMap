var config = {
  'database' : {
    'development': {
      host     : 'localhost',
      username : 'root',
      password : 'root',
      port     : 3306,
      database : 'twittmap_db_dev',
      dialect  : 'mysql',
    },
    'production': {
      host     : process.env.RDS_HOSTNAME,
      username : process.env.RDS_USERNAME,
      password : process.env.RDS_PASSWORD,
      port     : process.env.RDS_PORT,
      database : 'twittmap_db_prod',
      dialect  : 'mysql',
    },
  },
  'twitter' : {
    consumer_key: 'wMLBdSvB5EHfQxB4qr639C1Uv',
    consumer_secret: '2ycFuMfvaewnuyUt9w74u9KIKDnKl546iNfkrmmgJIC3MfOoDg',
    access_token: '1242584401-z3mXcrK6WPzpqOxNTiMqLsGpYW8c40Fcn04TDoR',
    access_token_secret: 'nypszBb6sjLcXVYkm5uIopznUmmPJLbK4YUvbkgXnVccY',
  },
};

module.exports = config;