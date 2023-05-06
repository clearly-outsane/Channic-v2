/* eslint-disable no-empty-function */
/* eslint-disable no-unused-vars */
/**
 * This function sends the google oauth URL to the user who typed the command
 */
const { generateUrl } = require("../src/config/googleapi");

const sendAuthUrl = (message, userId) => {
  const url = generateUrl(userId);
  message.user.send("Connect your Youtube account by logging in here: " + url);
};

module.exports = {
  sendAuthUrl,
};
