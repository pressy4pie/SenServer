module.exports = {
  webAppUrl: process.env.WEB_APP_URL || "http://localhost:3000",
  httpPort:  parseInt(process.env.PORT) || 3003,
  mqttPort:  1883
}