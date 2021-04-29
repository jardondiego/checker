const moment = require("moment");
const { google } = require("googleapis");

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

async function getAvailability(req, res) {
  const sheetsClient = google.sheets({ version: "v4" });
  const calendarClient = google.calendar({ version: "v3" });
  const jwt = getGAuthJwt();
  const {
    API_KEY: apiKey,
    SPREADSHEET_ID: spreadsheetId,
    CALENDAR_ID: calendarId,
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

    const stations = {};
    for (const station of values) {
      const [id, alias, free_at, is_queue] = station;
      const formattedStation = {
        id,
        free_at,
        is_queue: is_queue === "TRUE" ? true : false,
        busy_at: null,
      };

      stations[alias] = formattedStation;
    }

    // Handle calendar free-busy info
    const now = moment().toISOString();
    const tomorrowAtZero = moment()
      .add(1, "days")
      .set({ hours: 0, minutes: 0, seconds: 0 })
      .toISOString();

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

    const { items: eventsForToday } = data;
    for (const calendarEvent of eventsForToday) {
      const { summary: alias, start } = calendarEvent;
      if (alias in stations && stations[alias].busy_at === null) {
        stations[alias].busy_at = start.dateTime;
      }
    }

    const stationsResponse = Object.entries(stations).map(([key, value]) => ({
      alias: key,
      ...value,
    }));
    return res.json(stationsResponse);
  } catch (error) {
    console.error("Unexpected error");
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function notifyOnAvailable(_, res) {
  return res.json({ message: 'ok' });
}

module.exports = {
  getAvailability,
  notifyOnAvailable,
};
