const { google } = require("googleapis");
const moment = require("moment-timezone");

const isProduction = process.env.GQ_ENV === "production";

function getJwt() {
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

exports.getAvailability = async function (req, res) {
  // Enable CORS requests
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST");

  const sheetsClient = google.sheets({ version: "v4" });
  const calendarClient = google.calendar({ version: "v3" });
  const jwt = getJwt();
  const {
    API_KEY: apiKey,
    SPREADSHEET_ID: spreadsheetId,
    CALENDAR_ID: calendarId,
  } = process.env;

  // Handle spreadsheet data
  try {
    const {
      data: { values },
    } = await sheetsClient.spreadsheets.values.get(
      {
        spreadsheetId,
        range: "disponibilidad!A2:D5",
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
      const [id, alias, free_at, isQueue] = station;
      const formattedStation = {
        id,
        free_at,
        isQueue: isQueue === "TRUE" ? true : false,
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
      if (alias in stations) {
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
};
