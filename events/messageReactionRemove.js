const { default: axios } = require('axios');

module.exports = {
  name: 'messageReactionRemove',
  async execute(reaction, client) {
    let message = reaction.message;
    try {
      if (
        message.author.bot &&
        message.author.username === 'KawaiiKeeper' &&
        message.author.discriminator === '1538'
      ) {
        if (reaction._emoji.name === '❤️' && !client.bot) {
          await axios.patch(
            process.env.WEB_API_URL + '/photo/UNLIKE',

            { url: encodeURIComponent(message.embeds[0].image.url) },
            {
              headers: {
                Authorization: process.env.WEB_API_KEY,
                'discord-id': client.id,
                'discord-username': encodeURIComponent(client.username),
              },
            }
          );
          console.log('unliked by', client.id);
        }
      }
    } catch (error) {
      console.log(error);
    }
  },
};
