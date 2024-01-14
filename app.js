const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const app = express();

const corsOptions = {
  origin: "http://localhost:5173",
  credentials: true,
};

app.use(cors(corsOptions));

app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// app.use((req, res, next) => {
//   res.header("Access-Control-Allow-Origin", "http://localhost:5173/get");
//   // res.header("Access-Control-Allow-Origin", "http://localhost:5173/add");
//   // res.header("Access-Control-Allow-Origin", "http://localhost:5173/updatestatus");
//   // res.header("Access-Control-Allow-Origin", "http://localhost:5173/deleteTodo");
//   res.header("Access-Control-Allow-Credentials", true);
//   res.header(
//     "Access-Control-Allow-Headers",
//     "Origin, X-Requested-With, Content-Type, Accept"
//   );
//   next();
// });

const PORT = process.env.PORT || 8080;
const MongodbURI =
  "mongodb+srv://ToDoAppUser:85oZtV0xJDzmhE3P@todoappcluster.yrf95cf.mongodb.net/?retryWrites=true&w=majority";

const connectToDatabase = () => {
  mongoose
    .connect(MongodbURI)
    .then(() => {
      console.log("Connected to Monogodb database sucessfully!");

      const Todo = mongoose.model("Todo", {
        todos: [String],
        completed: [Boolean],
      });

      async function getAllTodos(userID) {
        try {
          const result = await Todo.findById(userID, "todos completed");
          return result
            ? { todos: result.todos, completed: result.completed }
            : null;
        } catch (error) {
          throw error;
        }
      }

      async function createNewUser(newToDo) {
        try {
          const todo = new Todo({
            todos: newToDo.todo,
            completed: newToDo.completed,
          });

          const newTodo = await todo.save();
          console.log("New User created !!!");
          console.log(`${newTodo}`);
          return newTodo._id;
        } catch (error) {
          console.error("Could not create new User !!!", error.message);
          throw error;
        }
      }

      async function addTodoForID(userId, todo) {
        try {
          const updatedUser = await Todo.findOneAndUpdate(
            { _id: userId },
            {
              $push: { todos: todo.todo, completed: todo.completed },
            },
            { new: true, useFindAndModify: false }
          );

          if (!updatedUser) {
            console.error("User not found");
            return null;
          }

          console.log("Added Todo:", updatedUser);
          return updatedUser;
        } catch (err) {
          console.error(err.message);
          throw err;
        }
      }

      async function updateStatus(userId, new_obj) {
        try {
          const result = await Todo.updateOne(
            {
              _id: userId,
              completed: { $exists: true, $elemMatch: { $exists: true } },
            },
            { $set: { [`completed.${new_obj.index}`]: new_obj.status } }
          );

          if (result.nModified === 0) {
            console.error("User not found or index not valid");
            return null;
          }

          console.log("Updated status:", result);
          return result;
        } catch (err) {
          console.error(err.message);
          throw err;
        }
      }

      async function deleteTodo(userId, indexes) {
        try {
          const Todo_obj = await getAllTodos(userId);
          if (Todo_obj === null) {
            return null;
          }
          indexes.sort((a, b) => b - a);

          // Delete elements at the specified indexes
          for (let index of indexes) {
            Todo_obj.todos.splice(index, 1);
            Todo_obj.completed.splice(index, 1);
          }

          Todo.findOneAndUpdate(
            { _id: userId },
            { todos: Todo_obj.todos, completed: Todo_obj.completed },
            { new: true }
          ).then((updatedDocument) => {
            if (updatedDocument) {
              console.log("Document updated successfully:", updatedDocument);
              return updatedDocument;
            } else {
              console.log("Document not found.");
              return null;
            }
          });
        } catch (error) {
          console.log(error.message);
          return null;
        }
      }

      app.get("/get", async (req, res) => {
        try {
          const userID = req.cookies.userID || "";

          if (userID !== "") {
            // User found
            const data = await getAllTodos(userID);
            if (data !== null) {
              res
                .status(201)
                .json({ todos: data.todos, completed: data.completed });
            } else {
              // User not found
              const userId = await createNewUser({ todo: [], completed: [] });
              res.cookie("userID", userId, {
                maxAge: 900000,
                httpOnly: true,
              });
              // Return default response for a new user
              res.status(201).json({ todos: [], completed: [] });
            }
          } else {
            // User not found
            const userId = await createNewUser({ todo: [], completed: [] });
            res.cookie("userID", userId, {
              maxAge: 900000,
              httpOnly: true,
            });
            // Return default response for a new user
            res.status(201).json({ todos: [], completed: [] });
          }
        } catch (e) {
          console.error(e.message);
          res.status(400).json({ todos: [], completed: [] });
        }
      });

      app.post("/add", async (req, res) => {
        try {
          const userID = req.cookies.userID || "";
          const newTodo = {
            todo: [req.body.todo],
            completed: [req.body.completed],
          };
          console.log("New Todo to add is:", newTodo);

          // User not found
          if (userID === "") {
            // Create a new User + set user's cookies
            const userId = await createNewUser(newTodo);
            console.log("new uID: ", userId);
            res.cookie("userID", userId, {
              maxAge: 900000,
              httpOnly: true,
            });
            res
              .status(201)
              .send(
                "userID did not match, So created new userID for you and added your todo"
              );
            return;
          }

          const data = await addTodoForID(userID, newTodo);

          if (data) {
            console.log("New Todo added successfully:", data);
            res.status(201).send("Done!");
          } else {
            const userId = await createNewUser(newTodo);
            res.cookie("userID", userId, {
              maxAge: 900000,
              httpOnly: true,
            });
            res
              .status(404)
              .send("User id does not match, we created a new UserId for you!");
          }
        } catch (e) {
          console.error(e.message);
          res.status(400).send("Failed!");
        }
      });

      app.post("/updatestatus", async (req, res) => {
        try {
          const userID = req.cookies.userID || "";
          const new_obj = { index: req.body.index, status: req.body.status };
          const data = await updateStatus(userID, new_obj);

          if (data) {
            res.status(201).send("Success!");
          } else {
            res.status(404).send("User not found or index not valid!");
          }
        } catch (error) {
          console.error(error.message);
          res.status(400).send("Failed!");
        }
      });

      app.delete("/deleteTodo", async (req, res) => {
        try {
          const userID = req.cookies.userID || "";
          const indexes = req.body.indexes;

          const success = await deleteTodo(userID, indexes); // Call the updated function

          if (success !== null) {
            res.status(200).send("Elements deleted successfully!"); // Use 200 for successful deletion
          } else {
            res
              .status(404)
              .send("Todo not found or no elements matched the indexes!");
          }
        } catch (error) {
          console.error(error.message);
          res.status(500).send("Internal server error!"); // Use 500 for server-side errors
        }
      });

      app.listen(PORT, () => {
        console.log(`Server listening on port ${PORT}`);
      });
    })
    .catch((err) => {
      console.log(`Connection to mongodb databes failed! ${err.message}`);
      setTimeout(() => connectToDatabase(), 500);
    });
};

connectToDatabase();
