const { SlashCommandBuilder } = require('discord.js');
const { oauth2Client } = require('../src/config/googleapi');
const { google } = require('googleapis');
const { getUser } = require('../utils/getUser');
const { sendAuthUrl } = require('../utils/sendAuthUrl');
const User = require('../src/models/Users');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlink')
    .setDescription(
      'Unlink a Youtube playlist from its Discord channel. The opposite of the link command.'
    )
    .addStringOption((option) =>
      option
        .setName('playlist-id')
        .setDescription(
          'This can be found in the url of the playlist after "list=".'
        )
        .setRequired(true)
    ),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    let playlistIdToBeRemoved = interaction.options.getString('playlist-id');

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

    const youtube = google.youtube({
      version: 'v3',
      auth: oauth2Client,
    });

    //check if playlist with that id exists
    let existingChannel = null;
    let playlistExists = mongoUser.playlists.some((playlist) => {
      if (playlist.youtube_id === playlistIdToBeRemoved) {
        existingChannel = playlist.channel;
        return true;
      } else {
        return false;
      }
    });

    let playListResult = await youtube.playlists.list({
      part: 'snippet',
      id: playlistIdToBeRemoved,
    });

    if (!playListResult || playListResult.data.items.length === 0) {
      return interaction.editReply({
        content: `No playlist found on Youtube with the id ${playlistIdToBeRemoved}`,
        ephemeral: true,
      });
    }

    if (playlistExists) {
      const query = {
        userId: interaction.user.id,
      };
      const update = {
        $pull: {
          playlists: {
            youtube_id: playlistIdToBeRemoved,
          },
        },
      };
      const options = {};
      await User.updateOne(query, update, options);
      return interaction.editReply({
        content: `Successfully unlinked playlist ${playListResult.data.items[0].snippet.title} from channel ${existingChannel.name}`,
        ephemeral: true,
      });
    } else {
      return interaction.editReply({
        content: `That playlist has not been linked to any channel so there is nothing to unlink.`,
        ephemeral: true,
      });
    }
  },
};
