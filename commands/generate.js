const axios = require('axios');
const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
  AttachmentBuilder,
} = require('discord.js');

const { createPromptEmbed } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('generate')
    .setDescription('Generates image with tags or from custom prompts!')
    .addStringOption((option) =>
      option
        .setName('background')
        .setDescription('The background of the image')
        .setRequired(false)
        .addChoices(
          { name: 'Beach', value: 'Beach' },
          { name: 'Mountains', value: 'Mountains' },
          { name: 'Forest', value: 'Forest' },
          { name: 'Sky', value: 'Sky' },
          { name: 'Indoors', value: 'Indoors' },
          { name: 'Dungeon', value: 'Dungeon' },
          { name: 'Desert', value: 'Desert' }
        )
    )
    .addStringOption((option) =>
      option
        .setName('character')
        .setDescription('The subject of the image')
        .setRequired(false)
        .addChoices(
          { name: 'Girl', value: 'Girl' },
          { name: 'Woman', value: 'Woman' },
          { name: 'Man', value: 'Man' },
          { name: 'Boy', value: 'Boy' },
          { name: 'Non-Binary', value: 'Non-Binary' },
          { name: 'Demon', value: 'Demon' },
          { name: 'Angel', value: 'Angel' }
        )
    )
    .addStringOption((option) =>
      option
        .setName('hair')
        .setDescription('Hair style of the subject')
        .setRequired(false)
        .addChoices(
          { name: 'Straight', value: 'Straight' },
          { name: 'Curly', value: 'Curly' },
          { name: 'Short', value: 'Short' },
          { name: 'Frizzy', value: 'Frizzy' },
          { name: 'Wavy', value: 'Wavy' },
          { name: 'Long', value: 'Long' },
          { name: 'Braided', value: 'Braided' }
        )
    )
    .addStringOption((option) =>
      option
        .setName('weather')
        .setDescription('The weather in the image')
        .setRequired(false)
        .addChoices(
          { name: 'Snowy', value: 'Snowy' },
          { name: 'Sunny', value: 'Sunny' },
          { name: 'Rainy', value: 'Rainy' },
          { name: 'Cloudy', value: 'Cloudy' },
          { name: 'Stormy', value: 'Stormy' }
        )
    )
    .addStringOption((option) =>
      option
        .setName('items')
        .setDescription('Any items that you want in the image')
        .setRequired(false)
        .addChoices(
          { name: 'Sword', value: 'Sword' },
          { name: 'Ball', value: 'Ball' },
          { name: 'Chocolate', value: 'Coconut' },
          { name: 'Dagger', value: 'Dagger' }
        )
    )
    .addStringOption((option) =>
      option
        .setName('custom')
        .setDescription('Add your own custom prompt')
        .setRequired(false)
    ),
  async execute(interaction) {
    let optionValues = interaction.options._hoistedOptions;

    await interaction.deferReply();

    try {
      const checkEligibility = await axios.get(
        process.env.WEB_API_URL + '/eligibility/TXT2IMG',
        {
          headers: {
            Authorization: process.env.WEB_API_KEY,
            'discord-id': interaction.user.id,
            'discord-username': encodeURIComponent(interaction.user.username),
          },
        }
      );
      if (!checkEligibility.data.eligible) {
        return await interaction.editReply({
          content:
            "You've run out of tokens! To get more tokens consider supporting us!",
          ephemeral: true,
        });
      }
      console.log('checkEligibility status:', checkEligibility.status);
    } catch (err) {
      throw console.log('checkEligibilityError', err, err.cause);
    }

    let prompt = getPrompt(optionValues);
    console.log('prompt: ', prompt);

    const response = await axios.get(
      process.env.ML_API_URL +
        '/generate' +
        `${prompt ? '?prompt=' + prompt : ''}`,
      {
        responseType: 'stream',
      }
    );

    let has_nsfw = false;
    if (response.headers.nsfw_string) {
      const nsfw_array = response.headers.nsfw_string.split(',');

      has_nsfw = nsfw_array.some((item) => item === 'True');
    }

    if (has_nsfw && !interaction.channel.nsfw) {
      return await interaction.editReply({
        content:
          'This image contains NSFW content! Please use this command in a NSFW channel!',
        ephemeral: true,
      });
    }

    const file = new AttachmentBuilder(response.data, {
      name: 'image.png',
    });
    const embedding = createPromptEmbed(
      prompt.length > 256 ? prompt.slice(250) + '...' : prompt,
      null,
      'attachment://image.png',
      interaction.user.username,
      interaction.user.discriminator
    );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('primary')
        .setLabel('Regenerate')
        .setStyle(ButtonStyle.Primary)
    );
    const reply = await interaction.editReply({
      // components: [row],
      embeds: [embedding],
      files: [file],
    });

    reply.react('❤️');
    reply.react('🔥');

    //upload image to db
    try {
      const uploadedImageResponse = await axios.post(
        process.env.WEB_API_URL + '/photo',
        { url: reply.embeds[0].image.url, prompt: prompt, nsfw: false },
        {
          headers: {
            Authorization: process.env.WEB_API_KEY,
            'discord-id': interaction.user.id,
            'discord-username': encodeURIComponent(interaction.user.username),
          },
        }
      );
      console.log(
        'uploadedImageResponse status:',
        uploadedImageResponse.status
      );
    } catch (err) {
      throw console.log('checkEligibility', err.cause);
    }
  },
};

function getPrompt(optionValues) {
  let prompt = '';

  const explicitlyIncluded = ['hair'];

  optionValues.forEach((element, index) => {
    console.log(element);
    prompt +=
      element.value +
      (explicitlyIncluded.includes(element.name) ? ' ' + element.name : '') +
      (index != optionValues.length - 1 ? ', ' : '');
  });
  return prompt;
}
