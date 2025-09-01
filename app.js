const express = require("express");
const path = require("path");
const mysql = require("mysql2");
require("dotenv").config();
const ejsMate = require("ejs-mate");
const bcrypt = require("bcrypt");
const multer = require("multer");
const bodyParser = require("body-parser");

const app = express();
const port = 8080;

// SQL pool
const pool = mysql
  .createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  })
  .promise();

  async function initializeDatabase() {
    try {
      // Create wardrobe table if it doesn't exist
      await pool.query(`
      CREATE TABLE IF NOT EXISTS wardrobe (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        link VARCHAR(500),
        color VARCHAR(50)
      )
    `);

      // Create user_info table if it doesn't exist
      await pool.query(`
      CREATE TABLE IF NOT EXISTS user_info (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL
      )
    `);

      console.log("Database tables ensured.");
    } catch (err) {
      console.error("Error initializing database:", err);
    }
  }

  // Call it before starting the server
  initializeDatabase();

  
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.engine("ejs", ejsMate);

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

// Start server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}/`);
});

// Get wardrobe items
async function getWardrobeItems() {
  try {
    console.log("Fetching wardrobe items from database...");
    const [results] = await pool.query("SELECT * FROM wardrobe");
    const wardrobeItems = results.reduce((acc, item) => {
      const category = item.type;
      if (!acc[category]) acc[category] = [];
      acc[category].push({
        name: item.name,
        link: item.link,
        color: item.color,
      });
      return acc;
    }, {});
    console.log("Wardrobe items fetched:", wardrobeItems);
    return wardrobeItems;
  } catch (error) {
    console.error("Error fetching wardrobe items:", error);
    throw error;
  }
}

// Routes
app.get("/", async (req, res) => {
  try {
    let wardrobeItems = await getWardrobeItems();
    Object.keys(wardrobeItems).forEach((category) => {
      wardrobeItems[category] = wardrobeItems[category].filter(
        (item) => item && item.name && item.link
      );
    });
    console.log("Rendering home page with wardrobe items...");
    res.render("files/home", { wardrobeItems });
  } catch (error) {
    console.error("Error in GET /:", error);
    res.status(500).send("Server Error");
  }
});

app.get("/login", (req, res) => {
  console.log("Rendering login page");
  res.render("files/signin");
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  console.log("Login attempt for user:", username);
  const sql = "SELECT * FROM user_info WHERE username = ?";
  try {
    const [result] = await pool.query(sql, [username]);
    if (result.length === 0) {
      console.log("User not found");
      return res.status(404).send("Invalid username or password");
    }
    const user = result[0];
    const passwordIsValid = await bcrypt.compare(password, user.password);
    if (!passwordIsValid) {
      console.log("Invalid password for user:", username);
      return res.status(404).send("Invalid username or password");
    }
    console.log("Login successful for user:", username);
    res.redirect("/");
  } catch (err) {
    console.error("Error logging in:", err);
    res.status(500).send("Error logging in");
  }
});

app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  console.log("Register attempt for:", username, email);
  const checkUserSql =
    "SELECT * FROM user_info WHERE username = ? OR email = ?";
  try {
    const [result] = await pool.query(checkUserSql, [username, email]);
    if (result.length > 0) {
      console.log("Username or email already exists:", username, email);
      return res.status(400).send("Username or email already exists");
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const insertUserSql =
      "INSERT INTO user_info (username, email, password) VALUES (?, ?, ?)";
    await pool.query(insertUserSql, [username, email, hashedPassword]);
    console.log("User registered successfully:", username);
    res.redirect("/login");
  } catch (err) {
    console.error("Error registering user:", err);
    res.status(500).send("Error registering user");
  }
});

app.get("/add-collections", (req, res) => {
  console.log("Rendering add-collections page");
  res.render("files/addcollections");
});

app.post("/add-collection", async (req, res) => {
  const { type, color, googleImageLink } = req.body;
  console.log("Adding wardrobe item:", type, color, googleImageLink);
  const query =
    "INSERT INTO wardrobe (type, name, link, color) VALUES (?, ?, ?, ?)";
  try {
    await pool.query(query, [type, type, googleImageLink, color]);
    console.log("Item added successfully");
    res.redirect("/");
  } catch (err) {
    console.error("Error adding collection item:", err);
    res.status(500).send("Error adding collection item");
  }
});

app.get("/search", async (req, res) => {
  const query = req.query.query;
  if (!query) {
    console.log("Search query missing");
    return res.status(400).send("Query parameter is required");
  }
  try {
    console.log("Searching wardrobe items for query:", query);
    const wardrobeItems = await searchWardrobeItems(query);
    res.render("files/searchResults", { wardrobeItems, query });
  } catch (error) {
    console.error("Error in search:", error);
    res.status(500).send("Server Error");
  }
});

async function searchWardrobeItems(query) {
  const sql = "SELECT * FROM wardrobe WHERE name LIKE ? OR color LIKE ?";
  const likeQuery = `%${query}%`;
  try {
    const [results] = await pool.query(sql, [likeQuery, likeQuery]);
    return results;
  } catch (error) {
    console.error("Error searching wardrobe items:", error);
    throw error;
  }
}

app.get("/stats", (req, res) => {
  console.log("Rendering stats page");
  res.render("files/stats", { mostWornItems, leastWornItems });
});

const mostWornItems = [
  { name: "Blue T-Shirt", count: 15 },
  { name: "Black Jeans", count: 10 },
  { name: "White Sneakers", count: 8 },
];

const leastWornItems = [
  { name: "Red Jacket", count: 1 },
  { name: "Formal Shoes", count: 0 },
  { name: "Green Hoodie", count: 2 },
];

app.get("/outfit-generator", async (req, res) => {
  try {
    const wardrobeItems = await getWardrobeItems();
    console.log("Rendering outfit-generator page");
    res.render("files/outfit", { wardrobeItems });
  } catch (error) {
    console.error("Error in outfit-generator:", error);
    res.status(500).send("Server Error");
  }
});

app.get("/community", async (req, res) => {
  try {
    const wardrobeItems = await getWardrobeItems();
    console.log("Rendering community page");
    res.render("files/community", { wardrobeItems });
  } catch (error) {
    console.error("Error in community:", error);
    res.status(500).send("Server Error");
  }
});

app.get("/styling", async (req, res) => {
  try {
    const wardrobeItems = await getWardrobeItems();
    console.log("Rendering styling page");
    res.render("files/styling", { wardrobeItems });
  } catch (error) {
    console.error("Error in styling:", error);
    res.status(500).send("Server Error");
  }
});

app.get("/ecoshop", (req, res) => {
  console.log("Rendering ecoshop page");
  res.render("files/ecoshop");
});
