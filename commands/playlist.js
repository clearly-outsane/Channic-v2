const { SlashCommandBuilder } = require('discord.js');
const { oauth2Client } = require('../src/config/googleapi');
const { google } = require('googleapis');
const { getUser } = require('../utils/getUser');
const { sendAuthUrl } = require('../utils/sendAuthUrl');
const { urlToVideoId } = require('../utils/UrlParser');
const User = require('../src/models/Users');
const fetchMessages = require('../utils/fetchMessages').default;

const addSong = async (interaction, youtube, playlistId, videoId) => {
  try {
    const response = await youtube.playlistItems.insert({
      part: 'snippet, status',
      resource: {
        snippet: {
          playlistId: playlistId,
          resourceId: {
            kind: 'youtube#video',
            videoId: videoId,
          },
        },
      },
    });
    console.log('Sond added: ', response.data.snippet.title);
    return response;
  } catch (error) {
    console.log(error);
    return {
      err: 'Error adding song to playlist',
    };
  }
};

const createOrUpdatePlaylist = async (
  interaction,
  youtube,
  mongoUser,
  videoIdList,
  channelFound
) => {
  let playlistIdToUpdate = null;
  let filteredVideoIdList = [...videoIdList];

  //check if theres a playlist already linked with the channel
  let playlistExists = mongoUser.playlists.some((playlist) => {
    if (playlist.channel.id === channelFound.id) {
      playlistIdToUpdate = playlist.youtube_id;
      return true;
    } else {
      return false;
    }
  });
  let playListResult = null;
  //check if it truly exists on youtube
  if (playlistExists) {
    playListResult = await youtube.playlists.list({
      part: 'snippet',
      id: playlistIdToUpdate,
    });
    if (playListResult && playListResult.data.items.length > 0) {
    } else {
      const query = {
        userId: interaction.user.id,
      };
      const update = {
        $pull: {
          playlists: {
            youtube_id: playlistIdToUpdate,
          },
        },
      };
      const options = {};
      await User.updateOne(query, update, options);
      playlistExists = false;
    }
  }
  let existingSongs = new Set();

  //create playlist if it doesnt exist
  if (!playlistExists) {
    try {
      const createPlaylistResponse = await youtube.playlists.insert({
        part: 'snippet,status',
        resource: {
          snippet: {
            title: channelFound.name,
            description: 'Playlist made by Discord bot Channic',
          },
        },
      });

      // Add playlist to user playlists. This is adn upsert for cases where the playlist is linked with this channel but the user deleted it on youtube so it doesn't exist though it's stored in our DB.
      const query = {
        userId: interaction.user.id,
      };
      const update = {
        $push: {
          playlists: {
            youtube_id: createPlaylistResponse.data.id,
            name: createPlaylistResponse.data.snippet.title,
            channel: {
              id: channelFound.id,
              name: channelFound.name,
            },
          },
        },
      };
      const options = {};
      await User.updateOne(query, update, options);

      playlistIdToUpdate = createPlaylistResponse.data.id;
    } catch (error) {
      console.log(error);
      return interaction.editReply({
        content:
          'An error occured while creating your playlist. Ask the creators for help.',
        ephemeral: true,
      });
    }

    await interaction.editReply({
      content: `Playlist ${channelFound.name} has been created in your Youtube account and is being updated...`,
    });
  } else {
    //get existing songs if playlist already exists
    let nextPageToken = undefined;
    do {
      //update existing playlist with new data if anything has changed
      const query = {
        userId: interaction.user.id,
        playlists: { $elemMatch: { youtube_id: playlistIdToUpdate } },
      };
      const update = {
        $set: {
          'playlists.$.name': playListResult.data.items[0].snippet.title,
          'playlists.$.channel.name': channelFound.name,
        },
      };
      const options = {};
      await User.updateOne(query, update, options);

      const playlistItemsResult = await youtube.playlistItems
        .list({
          part: 'snippet,contentDetails',
          maxResults: 50,
          playlistId: playlistIdToUpdate,
          pageToken: nextPageToken,
        })
        .catch((err) => {
          return console.log(err);
        });
      nextPageToken = playlistItemsResult.data?.nextPageToken;
      const items = playlistItemsResult.data?.items;

      items &&
        items.forEach((item) => {
          existingSongs.add(item.snippet.resourceId.videoId);
        });
    } while (nextPageToken);

    filteredVideoIdList = filteredVideoIdList.filter((item) => {
      return !existingSongs.has(item);
    });
  }

  let noOfSongs = filteredVideoIdList.length;

  if (
    mongoUser.quota.used + filteredVideoIdList.length >=
    mongoUser.quota.limit
  ) {
    noOfSongs = mongoUser.quota.limit - mongoUser.quota.used;
    noOfSongs = noOfSongs > 0 ? noOfSongs : 0;
  }

  let noOfAddedSongs = 0;
  mongoUser.executing = true;
  await mongoUser.save();
  // Loop through all the messages and add the video to the youtube playlist
  for (let i = 0; i < noOfSongs; i++) {
    const res = await addSong(
      interaction,
      youtube,
      playlistIdToUpdate,
      filteredVideoIdList[i]
    );
    if (!res || 'err' in res) {
    } else {
      noOfAddedSongs = noOfAddedSongs + 1;
    }
  }
  mongoUser.executing = false;
  mongoUser.quota.used = mongoUser.quota.used + noOfSongs;
  await mongoUser.save();

  return interaction.editReply({
    content: `Added ${noOfAddedSongs} song(s) to playlist ${
      playListResult.data.items.length > 0
        ? playListResult.data.items[0].snippet.title
        : channelFound.name
    }. Your remaining quota for the day is ${
      mongoUser.quota.limit - mongoUser.quota.used
    }`,
    ephemeral: true,
  });
};

const parseMessages = async (
  interaction,
  youtube,
  mongoUser,
  messages,
  channelFound
) => {
  let videoIdList = [];
  messages.forEach((message) => {
    const messageArray = message.content.split(' ');
    messageArray.forEach((word) => {
      const videoId = urlToVideoId(word);
      if (videoId !== -1) {
        videoIdList.push(videoId);
      }
    });
  });

  await createOrUpdatePlaylist(
    interaction,
    youtube,
    mongoUser,
    videoIdList,
    channelFound
  );
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('playlist')
    .setDescription(
      'Creates or updates a youtube playlist with all the youtube links in a channel.'
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
    await interaction.deferReply({ ephemeral: true });

    //Check if the channel exists based on whether the user entered a channel name as an argument or not
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
        content: "That channel doesn't exist",
        ephemeral: true,
      });
    }

    //If channel exists, check if user is logged in
    let mongoUser = await getUser(interaction.user.id);

    if (mongoUser && 'err' in mongoUser) {
      return interaction.editReply({
        content:
          'An error occured while fetching your user data. Call mom for help.',
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

    if (mongoUser.quota.used >= mongoUser.quota.limit) {
      return interaction.editReply({
        content: "You've exceeded your quota for the day. Try again tomorrow",
        ephemeral: true,
      });
    }
    //At this point user is logged in and has a quota more than 0
    const youtube = google.youtube({
      version: 'v3',
      auth: oauth2Client,
    });

    fetchMessages(
      channelFound,
      async (messages) =>
        await parseMessages(
          interaction,
          youtube,
          mongoUser,
          messages,
          channelFound
        )
    );
  },
};
