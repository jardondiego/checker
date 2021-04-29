const moment = require("moment");
const firebaseAdmin = require("./firebase");
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

const messaging = firebaseAdmin.messaging();
async function notifyOnAvailable(req, res) {
  const availableStations = [];
  for (const [alias, station] of Object.entries(req.stations)) {
    const { free_at } = station;
    if (!free_at) continue;
    const minsSinceFree = moment().diff(moment(free_at), "minutes");
    if (minsSinceFree === 0) availableStations.push(alias);
  }

  for (const alias of availableStations) {
    await messaging.sendToTopic("stations", {
      notification: {
        title: "¡Hay una estación disponible!",
        body: `${alias} se acaba de desocupar...`,
      },
    });
  }

  return res.json({ message: "ok" });
}

async function subscribeOnAvailable(req, res) {
  const { token: registrationToken } = req.body;
  await messaging.subscribeToTopic(registrationToken, "stations");
  return res.json({ message: "ok" });
}

module.exports = {
  getAvailability: [getRerservations, getStations, getAvailability],
  notifyOnAvailable: [authenticate, getStations, notifyOnAvailable],
  subscribeOnAvailable,
};
