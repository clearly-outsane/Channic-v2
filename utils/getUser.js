const User = require('../src/models/Users');

const getUser = async (authorId) => {
  try {
    const response = await User.findOne({ userId: authorId }).exec();
    return response;
  } catch (err) {
    return { err: 'No users found' };
  }
};

module.exports = {
  getUser,
};
