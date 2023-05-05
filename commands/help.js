const fs = require('fs');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Lists all available commands'),
  async execute(interaction) {
    let str = 'asd';
    const commandFiles = fs
      .readdirSync('./commands')
      .filter((file) => file.endsWith('.js'));

    let commandDescriptions = [];
    let commandNames = [];

    let embedData = [];
    for (const file of commandFiles) {
      const command = require(`./${file}`);
      let obj = {
        name: '/' + command.data.name,
        value: command.data.description,
      };
      embedData.push(obj);
      commandDescriptions.push(command.data.description);
      commandNames.push(command.data.name);
    }

    const exampleEmbed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle('List of commands')
      .setURL('https://kawaiikeeper.vercel.app/')
      .setDescription(
        'Available commands and their descriptions for Kawaii Keeper'
      )
      .setThumbnail(
        'https://kawaiikeeper.vercel.app/_next/image?url=https%3A%2F%2Fcdn.discordapp.com%2Fattachments%2F1054880809145876596%2F1070753426427879464%2Fimage.png&w=640&q=75'
      )
      .addFields(embedData);

    return interaction.reply({
      embeds: [exampleEmbed],
      ephemeral: true,
    });
  },
};
