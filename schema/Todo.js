const mongoose = require("mongoose");
const connection = require("../database/connection.js");

const TodoSchema = mongoose.Schema({
  todos: [
    {
      description: String,
      status: Boolean,
    },
  ],
});

const Todo = connection.model("Todo", TodoSchema);

module.exports = Todo;
