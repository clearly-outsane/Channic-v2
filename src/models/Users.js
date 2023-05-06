const mongoose = require('mongoose');
const CryptoJS = require('crypto-js');
require('dotenv').config();
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
  },
  tokens: {
    access_token: {
      type: String,
      unique: true,
      required: true,
    },
    refresh_token: {
      type: String,
      unique: true,
      sparse: true,
    },
    scope: {
      type: String,
      required: true,
    },
    expiry_date: {
      type: Date,
      required: true,
    },
  },
  playlists: [
    {
      youtube_id: {
        type: String,
        unique: true,
        sparse: true,
      },
      name: String,
      channel: {
        id: String,
        name: String,
      },
      created_at: Date,
      updated_at: Date,
    },
  ],
  quota: {
    limit: Number,
    used: Number,
  },
  executing: {
    type: Boolean,
    default: false,
  },
});

UserSchema.pre('save', function (next) {
  const user = this;
  if (!user.isModified('tokens.access_token')) return next();
  if (!user.isModified('tokens.refresh_token')) return next();

  user.tokens.access_token = CryptoJS.AES.encrypt(
    user.tokens.access_token,
    process.env.GOOGLE_CLIENT_SECRET
  ).toString();
  user.tokens.refresh_token = CryptoJS.AES.encrypt(
    user.tokens.refresh_token,
    process.env.GOOGLE_CLIENT_SECRET
  ).toString();
  next();
});

// TODO MAKE THIS POST HOOK
UserSchema.methods.getTokens = function () {
  const user = this;
  const access_token = CryptoJS.AES.decrypt(
    user.tokens.access_token,
    process.env.GOOGLE_CLIENT_SECRET
  );
  const refresh_token = CryptoJS.AES.decrypt(
    user.tokens.refresh_token,
    process.env.GOOGLE_CLIENT_SECRET
  );
  const Parsedaccess_token = access_token.toString(CryptoJS.enc.Utf8);
  const Parsedrefresh_token = refresh_token.toString(CryptoJS.enc.Utf8);

  return {
    access_token: Parsedaccess_token,
    refresh_token: Parsedrefresh_token,
  };
};

const User = mongoose.model('User', UserSchema, 'users');
module.exports = User;
