const { google } = require("googleapis");

function getJwt() {
  var credentials = require("./creds.json");
  return new google.auth.JWT(
    credentials.client_email,
    null,
    credentials.private_key,
    ["https://www.googleapis.com/auth/spreadsheets"]
  );
}

exports.getAvailability = async function (req, res) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST");
  const sheetsClient = google.sheets({ version: "v4" });
  const jwt = getJwt();
  try {
    const {
      data: { values },
    } = await sheetsClient.spreadsheets.values.get(
      {
        spreadsheetId: process.env.SPREADSHEET_ID,
        range: "Availability!A2:C5",
        key: process.env.API_KEY,
        auth: jwt,
      },
      {
        headers: {
          Referer: "https://gquarters.mx",
        },
      }
    );

    const stations = [];
    for (const station of values) {
      const [id, alias, finishes_at] = station;
      const formattedStation = { id, alias, finishes_at };
      stations.push(formattedStation);
    }

    return res.json(stations);
  } catch (error) {
    console.error("Unexpected error fetching sheets data");
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
