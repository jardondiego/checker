const express = require("express");
const cors = require("cors");
const moment = require("moment-timezone");
const { notifyOnAvailable, getAvailability } = require('./controllers');
const { handleError } = require("./middleware")

moment.tz.setDefault("America/Mexico_City");
const app = express();

app.use(cors());

app.get("/stations/notifyOnAvailable", notifyOnAvailable);
app.get("/stations/getAvailability", getAvailability);

app.use(handleError);

module.exports = {
  app,
};
