const express = require("express");
const mysql = require("mysql");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Simple CORS to allow development from other origins if needed
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Methods",
    "GET,PUT,POST,DELETE,PATCH,OPTIONS"
  );
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// Serve frontend files from public folder
app.use(express.static(path.join(__dirname, "public")));

// Root route serves the frontend index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// MySQL Connection (use a pool so `getConnection` exists)
const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "my_sql",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Optionally validate a connection from the pool at startup
pool.getConnection((err, connection) => {
  if (err) {
    console.error("Error connecting to MySQL database:", err);
    return;
  }
  console.log("Connected to MySQL database.");
  connection.release();
});

//get cats
app.get("/cats", (req, res) => {
  pool.getConnection((err, connection) => {
    if (err) {
      console.error("Error getting connection from pool:", err);
      res.status(500).json({ error: "Database connection failed" });
      return;
    }
    connection.query("SELECT * FROM cats", (qerr, rows) => {
      connection.release();
      if (qerr) {
        console.error("Error fetching data:", qerr);
        return res.status(500).json({ error: "Database query failed" });
      }
      res.json(rows);
    });
  });
});

// get cat by id
app.get("/cats/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid id" });
  }

  pool.getConnection((err, connection) => {
    if (err) {
      console.error("Error getting connection from pool:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }
    connection.query("SELECT * FROM cats WHERE id = ?", [id], (qerr, rows) => {
      connection.release();
      if (qerr) {
        console.error("Error fetching data:", qerr);
        return res.status(500).json({ error: "Database query failed" });
      }
      if (!rows || rows.length === 0) {
        return res.status(404).json({ error: "Not found" });
      }
      res.json(rows[0]);
    });
  });
});

// delete cat by id
app.delete("/cats/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid id" });
  }

  pool.getConnection((err, connection) => {
    if (err) {
      console.error("Error getting connection from pool:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    connection.query("DELETE FROM cats WHERE id = ?", [id], (qerr, result) => {
      connection.release();
      if (qerr) {
        console.error("Error deleting data:", qerr);
        return res.status(500).json({ error: "Database delete failed" });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Not found" });
      }
      res.json({ success: true, affectedRows: result.affectedRows });
    });
  });
});

// create a new cat
app.post("/cats", (req, res) => {
  const { name, tag, descrpt, img } = req.body;
  if (!name || typeof name !== "string") {
    return res
      .status(400)
      .json({ error: "Field 'name' is required and must be a string" });
  }

  pool.getConnection((err, connection) => {
    if (err) {
      console.error("Error getting connection from pool:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const sql = "INSERT INTO cats (name, tag, descrpt, img) VALUES (?,?,?,?)";
    const params = [name, tag || null, descrpt || null, img || null];
    connection.query(sql, params, (qerr, result) => {
      connection.release();
      if (qerr) {
        console.error("Error inserting data:", qerr);
        return res.status(500).json({ error: "Database insert failed" });
      }
      res.status(201).json({ success: true, id: result.insertId });
    });
  });
});

// update cat by id
app.put("/cats/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid id" });
  }

  const { name, tag, descrpt, img } = req.body;
  const fields = [];
  const params = [];

  if (name !== undefined) {
    if (typeof name !== "string")
      return res.status(400).json({ error: "Field 'name' must be a string" });
    fields.push("name = ?");
    params.push(name);
  }
  if (tag !== undefined) {
    if (tag !== null && typeof tag !== "string")
      return res
        .status(400)
        .json({ error: "Field 'tag' must be a string or null" });
    fields.push("tag = ?");
    params.push(tag);
  }
  if (descrpt !== undefined) {
    if (descrpt !== null && typeof descrpt !== "string")
      return res
        .status(400)
        .json({ error: "Field 'descrpt' must be a string or null" });
    fields.push("descrpt = ?");
    params.push(descrpt);
  }
  if (img !== undefined) {
    if (img !== null && typeof img !== "string")
      return res
        .status(400)
        .json({ error: "Field 'img' must be a string or null" });
    fields.push("img = ?");
    params.push(img);
  }

  if (fields.length === 0) {
    return res.status(400).json({ error: "No fields provided to update" });
  }

  // add id param for WHERE
  params.push(id);
  const sql = `UPDATE cats SET ${fields.join(", ")} WHERE id = ?`;

  pool.getConnection((err, connection) => {
    if (err) {
      console.error("Error getting connection from pool:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    connection.query(sql, params, (qerr, result) => {
      connection.release();
      if (qerr) {
        console.error("Error updating data:", qerr);
        return res.status(500).json({ error: "Database update failed" });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Not found" });
      }
      res.json({ success: true, affectedRows: result.affectedRows });
    });
  });
});

// patch (partial update) cat by id
app.patch("/cats/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid id" });
  }

  const { name, tag, descrpt, img } = req.body;
  const fields = [];
  const params = [];

  if (name !== undefined) {
    if (typeof name !== "string")
      return res.status(400).json({ error: "Field 'name' must be a string" });
    fields.push("name = ?");
    params.push(name);
  }
  if (tag !== undefined) {
    if (tag !== null && typeof tag !== "string")
      return res
        .status(400)
        .json({ error: "Field 'tag' must be a string or null" });
    fields.push("tag = ?");
    params.push(tag);
  }
  if (descrpt !== undefined) {
    if (descrpt !== null && typeof descrpt !== "string")
      return res
        .status(400)
        .json({ error: "Field 'descrpt' must be a string or null" });
    fields.push("descrpt = ?");
    params.push(descrpt);
  }
  if (img !== undefined) {
    if (img !== null && typeof img !== "string")
      return res
        .status(400)
        .json({ error: "Field 'img' must be a string or null" });
    fields.push("img = ?");
    params.push(img);
  }

  if (fields.length === 0) {
    return res.status(400).json({ error: "No fields provided to update" });
  }

  params.push(id);
  const sql = `UPDATE cats SET ${fields.join(", ")} WHERE id = ?`;

  pool.getConnection((err, connection) => {
    if (err) {
      console.error("Error getting connection from pool:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    connection.query(sql, params, (qerr, result) => {
      connection.release();
      if (qerr) {
        console.error("Error updating data:", qerr);
        return res.status(500).json({ error: "Database update failed" });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Not found" });
      }
      res.json({ success: true, affectedRows: result.affectedRows });
    });
  });
});

// // Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
