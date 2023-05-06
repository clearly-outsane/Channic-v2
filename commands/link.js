const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('link')
    .setDescription('Link an existing playlist with a discord channel.')
    .addStringOption((option) =>
      option
        .setName('playlist-id')
        .setDescription(
          'This can be found in the url of the playlist after "list=".'
        )
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('channel-name')
        .setDescription(
          'The name of the channel to make a playlist of. If not provided, the current channel will be used.'
        )
        .setRequired(false)
    ),
  async execute(interaction) {
    await interaction.reply('Pong!');
  },
};
