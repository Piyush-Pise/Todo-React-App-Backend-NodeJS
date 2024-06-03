const express = require("express");
const Todo = require("./schema/Todo");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 8080;

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

const createNewTodo = (description, status) => {
  return {
    todos: [{ description: description, status: status }],
  };
};

async function validateUser(userId) {
  try {
    const IsValid = await Todo.findById(userId);
    if (IsValid !== null) {
      console.log("userId found!");
      return true;
    } else {
      console.log("userId Not found!");
      return false;
    }
  } catch (error) {
    console.log("Error while verifying userId: ", error);
  }
}

async function createNewUser(newTodo) {
  try {
    const document = await Todo.create(newTodo);
    console.log("New User created: userID", document._id);
    return document._id;
  } catch (error) {
    console.log("Could not get user's todo data: ", error);
    return null;
  }
}

async function getUsersTodoData(userId) {
  try {
    const todos = await Todo.findById(userId, "todos");
    console.log("User's todo data: ", todos);
    return todos;
  } catch (error) {
    console.log("Could not get user's todo data: ", error);
    return null;
  }
}

async function addUsersNewTodoData(userId, newTodo) {
  try {
    const result = await Todo.updateOne(
      { _id: userId },
      { $push: { todos: newTodo.todos } }
    );
    console.log(result);
    if (result.modifiedCount === 1) {
      console.log("New entry added successfully.");
      return true;
    } else {
      console.log(
        "Failed to add new entry. Document not found or no modification made."
      );
      return false;
    }
  } catch (error) {
    console.log("Could not add new todo to user's data: ", error);
    return false;
  }
}

async function saveTodosArray(userId, newTodosArray) {
  try {
    const result = await Todo.updateOne(
      { _id: userId },
      { $set: { todos: newTodosArray } }
    );
    if (result) {
      return true;
    } else {
      console.log("could not save new Todos array");
      return false;
    }
  } catch (error) {
    console.log("Error occured while saving the new todos array");
    console.log(error);
    return false;
  }
}

function updateAndReturnNewTodosArray(Todos = [], index) {
  if (index >= Todos.length) {
    return Todos;
  }
  console.log(Todos);
  Todos[index].status = !Todos[index].status;
  return Todos;
}

function deleteAndReturnNewTodosArray(todos, indexes) {
  const NewTododsArray = []
  let k = indexes.length-1;
  for (let i = 0; i < todos.length; i++) {
    if(k >= 0 && i === indexes[k])
    {
      k--;
    }
    else
    {
      NewTododsArray.push(todos[i]);
    }
  }
  return NewTododsArray;
}

async function updateUsersTodoData(userId, index) {
  try {
    const todos = await getUsersTodoData(userId);
    if (todos !== null) {
      const TodosArray = updateAndReturnNewTodosArray(todos.todos, index);
      const savedSuccessfully = await saveTodosArray(userId, TodosArray);
      return savedSuccessfully;
    } else {
      return false;
    }
  } catch (error) {
    console.log("Could not update user's todo data: ", error);
    return false;
  }
}

async function deleteUsersTodoData(userId, indexes) {
  try {
    const todos = await getUsersTodoData(userId);
    if (todos !== null) {
      const Todos = deleteAndReturnNewTodosArray(todos.todos, indexes);
      const savedSuccessfully = await saveTodosArray(userId, Todos);
      return savedSuccessfully;
    } else {
      return false;
    }
  } catch (error) {
    console.log("Could not delete user's todo data: ", error);
    return false;
  }
}

app.get("/api/get", async (req, res) => {
  try {
    const userId = req.query.userId;
    // console.log(req.data);
    console.log('incoming userId:', userId);
    // UserId exists
    if (userId !== "") {
      try {
        const data = await getUsersTodoData(userId);
        console.log("successfully processed /get request");
        res.status(201).json({ userId: userId, todos: data.todos });
      } catch (error) {
        console.log("error occured while processing /get request", error);
        res.status(400);
      }
    } else {
      // Create new user.
      try {
        const id = await createNewUser({ todos: [] });
        console.log("New User created: userID", id);
        res.status(201).json({ userId: id, todos: [] });
      } catch (error) {
        console.log("error occured while processing /get request");
        console.log("could not create new user");
        console.log("error:", error);
        res.status(400);
      }
    }
  } catch (error) {
    console.log("Could not complete /get request: ", error);
    res.status(400);
  }
});

app.post("/api/add", async (req, res) => {
  console.log(req.body);
  try {
    const userId = req.body.userId;
    const newTodo = createNewTodo(req.body.description, req.body.status);
    const isValidUser = await validateUser(userId);
    if (isValidUser) {
      const IsAdded = await addUsersNewTodoData(userId, newTodo);
      if (IsAdded) {
        res.status(201).json({ userId: userId });
      } else {
        res.status(400).send("Could not add todo nor update database!");
      }
    } else {
      const id = await createNewUser(newTodo);
      res.status(201).json({ userId: id });
    }
  } catch (error) {
    console.log("Error while processing /add request", error);
    res.status(400).send("Error while processing /add request");
  }
});

app.post("/api/update", async (req, res) => {
  try {
    const userId = req.body.userId;
    const isValidUser = await validateUser(userId);
    if (isValidUser) {
      const updated = await updateUsersTodoData(userId, req.body.index);
      if (updated) {
        res.status(201).json({ userId: userId });
      } else {
        res.status(400).send("Could not update todo in the database!");
      }
    } else {
      const id = await createNewUser(newTodo);
      res.status(201).json({ userId: userId });
    }
  } catch (error) {
    console.log("Error while processing /update request", error);
    res.status(400).send("Error while processing /update request");
  }
});

app.delete("/api/delete", async (req, res) => {
  // console.log(req.body);
  try {
    const userId = req.body.userId;
    const isValidUser = await validateUser(userId);
    if (isValidUser) {
      const updated = await deleteUsersTodoData(userId, req.body.indexes);
      if (updated) {
        res.status(201).json({ userId: userId });
      } else {
        res.status(400).send("Could not delete todo/todos in the database!");
      }
    } else {
      const id = await createNewUser(newTodo);
      res.status(201).json({ userId: userId });
    }
  } catch (error) {
    console.log("Error while processing /delete request", error);
    res.status(400).send("Error while processing /delete request");
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on PORT ${PORT}`);
});