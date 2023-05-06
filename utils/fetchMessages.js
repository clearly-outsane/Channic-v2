let lastID;
let messages = [];

exports.default = async (channel, callback) => {
  messages = [];
  lastID = null;
  try {
    while (true) {
      // eslint-disable-line no-constant-condition
      const fetchedMessages = await channel.messages.fetch(
        {
          limit: 100,
          ...(lastID && { before: lastID }),
        },
        { force: true }
      );
      console.log("size", fetchedMessages.size, lastID);
      if (fetchedMessages.size === 0) {
        return callback(messages);
      }
      fetchedMessages.forEach((message) => messages.push(message));
      lastID = fetchedMessages.lastKey();
    }
  } catch (e) {
    console.log(e);
  }
};
