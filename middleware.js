const { google } = require("googleapis");
const moment = require("moment");

const isProduction = process.env.GQ_ENV === "production";

function getGAuthJwt() {
  var credentials = require("./creds.json");
  return new google.auth.JWT(
    credentials.client_email,
    null,
    credentials.private_key,
    [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/calendar.readonly",
    ]
  );
}

async function getStations(req, _, next) {
  const sheetsClient = google.sheets({ version: "v4" });
  const jwt = getGAuthJwt();
  const {
    API_KEY: apiKey,
    SPREADSHEET_ID: spreadsheetId,
    GSHEET_NAME: gSheetName,
    GSHEET_RANGE: gSheetRange,
  } = process.env;

  try {
    const {
      data: { values },
    } = await sheetsClient.spreadsheets.values.get(
      {
        spreadsheetId,
        range: `${gSheetName}!${gSheetRange}`,
        key: apiKey,
        auth: jwt,
      },
      {
        headers: {
          Referer: isProduction ? req.headers.referer : "https://gquarters.mx",
        },
      }
    );

    req.stations = {};
    for (const station of values) {
      const [id, alias, free_at, is_queue] = station;
      const formattedStation = {
        id,
        free_at,
        is_queue: is_queue === "TRUE" ? true : false,
        busy_at: null,
      };

      req.stations[alias] = formattedStation;
    }
  } catch (error) {
    return next(error);
  }

  next();
}

async function getRerservations(req, _, next) {
  const calendarClient = google.calendar({ version: "v3" });
  const jwt = getGAuthJwt();
  const { API_KEY: apiKey, CALENDAR_ID: calendarId } = process.env;

  const now = moment().toISOString();
  const tomorrowAtZero = moment()
    .add(1, "days")
    .set({ hours: 0, minutes: 0, seconds: 0 })
    .toISOString();

  try {
    const { data } = await calendarClient.events.list(
      {
        auth: jwt,
        key: apiKey,
        calendarId,
        timeMin: now,
        timeMax: tomorrowAtZero,
      },
      {
        headers: {
          Referer: isProduction ? req.headers.referer : "https://gquarters.mx",
        },
      }
    );

    req.calendarEvents = data.items;
  } catch (error) {
    return next(error);
  }

  next();
}

function authenticate(req, res, next) {
  const utilisers = require("./utilisers.json");
  const { authentication } = req.headers;
  if (!utilisers.includes(authentication))
    return res.status(403).json({ message: "Forbidden" });

  next();
}

module.exports = {
  getStations,
  getRerservations,
  authenticate
};
