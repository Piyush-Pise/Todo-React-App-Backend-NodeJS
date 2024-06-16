const { response } = require("express");
const mongoose = require("mongoose");
const dbURI = process.env.MongoDBURL;
const config = {};
let connection;
try {
  connection = mongoose.createConnection(dbURI, config);
  console.log("Connected to MongoDB database");
} catch (error) {
  console.log("Could not coonect to MongoDB database: ", error);
}

module.exports = connection;
