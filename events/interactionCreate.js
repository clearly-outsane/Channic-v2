module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      await interaction.editReply({
        content:
          'Kawaii Keeper is overwhelmed. To upgrade Kawaii Keeper consider supporting us!',
        ephemeral: true,
      });
    }
  },
};
