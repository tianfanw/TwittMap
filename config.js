var config = {};
config['development'] = {
  host: 'localhost',
  username: 'root',
  password : 'root',
  port : 3306,
  database: 'twittmap_db_dev',
  dialect: 'mysql'
};
config['production'] = {
  host: process.env.RDS_HOSTNAME,
  username: process.env.RDS_USERNAME,
  password : process.env.RDS_PASSWORD,
  port : process.env.RDS_PORT,
  database: 'twittmap_db_prod',
  dialect: 'mysql'
};

module.exports = config;