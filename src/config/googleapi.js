const { google } = require("googleapis");
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.REDIRECT_URL
);

// generate a url that asks permissions for Blogger and Google Calendar scopes
const scopes = ["https://www.googleapis.com/auth/youtube", "email"];

const generateUrl = (authorId) => {
  const stateObj = { authorId, command: "make", args: "soemthing" };
  // console.log('stringi', JSON.stringify(stateObj));
  const url = oauth2Client.generateAuthUrl({
    // 'online' (default) or 'offline' (gets refresh_token)
    access_type: "offline",
    prompt: "consent",

    // If you only need one scope you can pass it as a string
    scope: scopes,
    state: JSON.stringify(stateObj),
  });
  return url;
};

module.exports = { oauth2Client, generateUrl };
