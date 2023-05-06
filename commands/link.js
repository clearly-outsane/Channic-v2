const { SlashCommandBuilder } = require('discord.js');
const { oauth2Client } = require('../src/config/googleapi');
const { google } = require('googleapis');
const { getUser } = require('../utils/getUser');
const { sendAuthUrl } = require('../utils/sendAuthUrl');
const User = require('../src/models/Users');

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
    let playlistIdToBeAdded = interaction.options.getString('playlist-id');
    const channelFound = interaction.options.getString('channel-name')
      ? interaction.guild.channels.cache.find(
          (channel) =>
            channel.name === interaction.options.getString('channel-name')
        )
      : interaction.guild.channels.cache.find(
          (channel) => channel.id === interaction.channelId
        );

    if (!channelFound) {
      return interaction.editReply({
        content: "A channel with that name doesn't exist.",
        ephemeral: true,
      });
    }

    //check if user is logged in
    let mongoUser = await getUser(interaction.user.id);
    if (mongoUser && 'err' in mongoUser) {
      return interaction.editReply({
        content:
          'An error occured while fetching your user data. Ask the creators for help.',
        ephemeral: true,
      });
    }

    if (!mongoUser) {
      await sendAuthUrl(interaction, interaction.user.id);

      return interaction.editReply({
        content:
          'You need to be logged in first. Login using the link sent to your DMs and try again.',
        ephemeral: true,
      });
    } else {
      if (mongoUser.executing) {
        return interaction.editReply({
          content:
            "You're already executing a command. Please wait for it to finish before executing another command.",
          ephemeral: true,
        });
      }

      const gotTokens = mongoUser.getTokens();
      const parsedTokens = {
        access_token: gotTokens.access_token,
        refresh_token: gotTokens.refresh_token,
        scope: mongoUser.tokens.scope,
        expiry_date: mongoUser.tokens.expiry_date,
      };

      console.log('gotTokens', gotTokens);
      oauth2Client.setCredentials(parsedTokens);
    }

    //check if playlist with that id exists
    let existingChannel = null;
    let playlistExists = mongoUser.playlists.some((playlist) => {
      if (playlist.channel.id === playlistIdToBeAdded) {
        existingChannel = playlist.channel;
        return true;
      } else {
        return false;
      }
    });

    let playListResult = await youtube.playlists.list({
      part: 'snippet',
      id: playlistIdToUpdate,
    });

    if (!playListResult || playListResult.data.items.length === 0) {
      return interaction.editReply({
        content: `No playlist found on Youtube with the id ${playlistIdToBeAdded}`,
        ephemeral: true,
      });
    }

    if (playlistExists) {
      return interaction.editReply({
        content: `That playlist has already been linked to a channel with the name ${existingChannel.name}`,
        ephemeral: true,
      });
    } else {
      const query = {
        userId: interaction.user.id,
      };
      const update = {
        $push: {
          playlists: {
            youtube_id: playlistIdToBeAdded,
            name: playListResult.data.items[0].snippet.title,
            channel: {
              id: channelFound.id,
              name: channelFound.name,
            },
          },
        },
      };
      const options = {};
      await User.updateOne(query, update, options);

      return interaction.editReply({
        content: `Successfully linked playlist ${playListResult.data.items[0].snippet.title} to channel ${channelFound.name}`,
        ephemeral: true,
      });
    }
  },
};
