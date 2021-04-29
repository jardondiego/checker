const admin = require("firebase-admin");

const isProduction = process.env.GQ_ENV === "production";
const credentials = require(`./firebase-credentials${
  isProduction ? "" : "-staging"
}.json`);

const firebaseAdmin = admin.initializeApp({
  credential: admin.credential.cert(credentials),
});

module.exports = firebaseAdmin;
