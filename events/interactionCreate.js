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
          'Something went wrong while executing this command. Ask the creators for help.',
        ephemeral: true,
      });
    }
  },
};
