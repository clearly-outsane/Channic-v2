const mongoose = require("mongoose");
require("dotenv").config();

const db = process.env.DB_URI;

const connectDB = async () => {
  try {
    await mongoose.connect(db, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      family: 4,
    });

    console.log("MongoDB Connected");
  } catch (error) {
    console.error(error.message);

    process.exit(1);
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
};

module.exports = { connectDB, disconnectDB };
