"use strict";

module.exports = function(sequelize, DataTypes) {
  var Tweet = sequelize.define("Tweet", {

    keyword  : DataTypes.STRING,
    text     : DataTypes.STRING,
    time     : DataTypes.DATE,
    latitude : DataTypes.FLOAT,
    longitude: DataTypes.FLOAT,
    user     : DataTypes.STRING,
    profile  : DataTypes.STRING,
  }, {
    charset: 'utf8',
    timestamps: false,
  });

  return Tweet;
};