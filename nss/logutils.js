// logutils.js
/*
*
* Was getting tired of trying to format all my log messages, so here we go. 
* 
*/
var chalk = require('chalk');
module.exports = {
  dblog: function ( log_str ) {
      console.log( chalk.blue('[  DB UTILS  ] ') , log_str );
  },
  mslog: function ( log_str ) {
      console.log( chalk.magenta('[  MS UTILS  ] ') , log_str );
  },
  mqttlog: function ( log_str ) {
      console.log( chalk.green('[ MQTT UTILS ] ') , log_str );   
  },
  log: function ( log_str ) {
      console.log( chalk.cyan('[   DEBUG  ] ') , log_str );
  },
  errlog: function ( log_str ) {
      console.log( chalk.red('[   !ERROR!   ] ') , log_str );
  }
};