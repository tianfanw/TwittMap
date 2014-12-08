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
    consumer_key: '',
    consumer_secret: '',
    access_token: '',
    access_token_secret: '',
  },
  'alchemyapi' : {
    api_key : '',
  },
  'aws' : {
    region: '',
    accessKeyId: '',
    secretAccessKey: '',
  },
};

module.exports = config;
