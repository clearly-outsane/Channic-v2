module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    const chance = Math.random();
    // if (chance < 0.1) {
    //   const emojis = message.guild.emojis.cache;
    //   const randomEmojiKey = emojis.randomKey();
    //   const randomEmoji = client.emojis.cache.get(randomEmojiKey);
    //   await message.react(randomEmoji);
    // }
  },
};
