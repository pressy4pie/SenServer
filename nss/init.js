/** This happens whenever the app starts. */
function init_program(){
  start_node_checker();
  start_alarm_checker();
  start_timer_checker();
  logUtils.log('Init complete.');
} 

// Start the background checker for node aliveness.
function start_node_checker(){
  var node_check_frequency = 10000; //ten seconds. In production this will be like 15 minutes.
  var node_checker_id = setInterval(dbutils.check_node_alive, node_check_frequency);
}

// Start alarm checker.
function start_alarm_checker(){
  // for every alarm in db:
  // create something to watch the conditional and act upon it accordingly.
}

// Start timer checker
function start_timer_checker(){
  //for every timer in db: 
  // if timer is cron:
    // create cron job to execute the execute portion. 
  // if timer is schedule:
    // setInterval the amount of time to execute the execute portion. will probably mqtt to myself. 
}
module.exports = {
    start_node_checker : start_node_checker,
    start_alarm_checker : start_alarm_checker,
    start_timer_checker: start_timer_checker,
    init_program : init_program
} 