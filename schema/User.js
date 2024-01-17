const mongoose = require("mongoose");
const connection = require("../database/connection.js");

const user = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
});

const User = connection.model("User", user);

module.exports = User;
