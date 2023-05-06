const express = require('express');
const router = express.Router();
const { oauth2Client } = require('../config/googleapi');
const CryptoJS = require('crypto-js');
const jwt_decode = require('jwt-decode');
require('dotenv').config();
const User = require('../models/Users');

router.get('/', async (req, res) => {
  try {
    if (!req.query) {
      res.send({ msg: 'Not authenticated' });
    }
    // TODO: Check the scope returned to verify if the user actually
    // gave manage youtube acc permisions.

    const { code, state } = req.query;
    const parsedState = JSON.parse(state);
    console.log('STATE', parsedState.authorId);
    const { tokens } = await oauth2Client.getToken(code);
    console.log('Tokens', tokens);
    // console.log('scope:', tokens.scope);
    const userInfo = jwt_decode(tokens.id_token);
    // console.log(userInfo);
    // oauth2Client.setCredentials(tokens);

    User.findOne({ email: userInfo.email }).then((user) => {
      if (user) {
        return res.status(403).json({ msg: 'You have authenticated already' });
      } else {
        const newUser = new User({
          userId: parsedState.authorId,
          email: userInfo.email,
          tokens: {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            scope: tokens.scope,
            expiry_date: tokens.expiry_date,
          },
          quota: {
            limit: 100,
            used: 0,
          },
          executing: false,
        });
        newUser
          .save()
          .then(() => res.send({ msg: 'You are successfully authenticated ' }))
          .catch((err) => console.log(err));
      }
    });
  } catch (e) {
    console.log(e);
  }
});

module.exports = { router };
