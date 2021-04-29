const { getStations, getRerservations, authenticate } = require("./middleware");

function getAvailability(req, res) {
  const stations = { ...req.stations };
  const { calendarEvents } = req;
  for (const calendarEvent of calendarEvents) {
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
}

async function notifyOnAvailable(req, res) {
  return res.json({ message: "ok" });
}

module.exports = {
  getAvailability: [getRerservations, getStations, getAvailability],
  notifyOnAvailable: [authenticate, getStations, notifyOnAvailable],
};
