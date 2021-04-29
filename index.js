const express = require("express");
const cors = require("cors");
const moment = require("moment-timezone");
const {
  notifyOnAvailable,
  getAvailability,
  subscribeOnAvailable,
} = require("./controllers");

moment.tz.setDefault("America/Mexico_City");
const app = express();

app.use(cors());

app.get("/stations/notifyOnAvailable", notifyOnAvailable);
app.get("/stations/getAvailability", getAvailability);
app.post("/stations/subscribeOnAvailable", subscribeOnAvailable);

app.disable("x-powered-by");

module.exports = {
  app,
};
