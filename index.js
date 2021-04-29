const express = require("express");
const cors = require("cors");
const moment = require("moment-timezone");
const { notifyOnAvailable, getAvailability } = require('./controllers');

moment.tz.setDefault("America/Mexico_City");
const app = express();

app.use(cors());
app.get("/stations/nofityOnAvailable", notifyOnAvailable);
app.get("/stations/getAvailability", getAvailability);

module.exports = {
  app,
};
