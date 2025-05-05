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
//this is sql
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

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.engine("ejs", ejsMate);

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}/`);
});

function getWardrobeItems() {
  return pool
    .query("SELECT * FROM wardrobe")
    .then(([results]) => {
      const wardrobeItems = results.reduce((acc, item) => {
        const category = item.type;
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push({
          name: item.name,
          link: item.link,
          color: item.color,
        });
        return acc;
      }, {});
      return wardrobeItems;
    })
    .catch((error) => {
      throw error;
    });
}

app.get("/", async (req, res) => {
  try {
    let wardrobeItems = await getWardrobeItems();
    Object.keys(wardrobeItems).forEach((category) => {
      wardrobeItems[category] = wardrobeItems[category].filter(
        (item) => item && item.name && item.link
      );
    });
    res.render("files/home", { wardrobeItems });
  } catch (error) {
    res.status(500).send("Server Error");
  }
});

app.get("/login", (req, res) => {
  res.render("files/signin");
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const sql = "SELECT * FROM user_info WHERE username = ?";
  pool
    .query(sql, [username])
    .then(async ([result]) => {
      if (result.length === 0) {
        return res.status(404).send("Invalid username or password");
      }
      const user = result[0];
      const passwordIsValid = await bcrypt.compare(password, user.password);
      if (!passwordIsValid) {
        return res.status(404).send("Invalid username or password");
      }
      res.redirect("/");
    })
    .catch((err) => {
      res.status(500).send("Error logging in");
    });
});

app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  const checkUserSql =
    "SELECT * FROM user_info WHERE username = ? OR email = ?";
  pool
    .query(checkUserSql, [username, email])
    .then(async ([result]) => {
      if (result.length > 0) {
        return res.status(400).send("Username or email already exists");
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const insertUserSql =
        "INSERT INTO user_info (username, email, password) VALUES (?, ?, ?)";
      return pool.query(insertUserSql, [username, email, hashedPassword]);
    })
    .then(() => {
      res.redirect("/login");
    })
    .catch((err) => {
      res.status(500).send("Error registering user");
    });
});

app.get("/add-collections", (req, res) => {
  res.render("files/addcollections");
});

app.post("/add-collection", (req, res) => {
  const { type, color, googleImageLink } = req.body;
  const query =
    "INSERT INTO wardrobe (type, name, link, color) VALUES (?, ?, ?, ?)";
  pool
    .query(query, [type, type, googleImageLink, color])
    .then(() => {
      res.redirect("/");
    })
    .catch((err) => {
      res.status(500).send("Error adding collection item");
    });
});

app.get("/search", async (req, res) => {
  const query = req.query.query;
  if (!query) {
    return res.status(400).send("Query parameter is required");
  }
  try {
    const wardrobeItems = await searchWardrobeItems(query);
    res.render("files/searchResults", { wardrobeItems, query });
  } catch (error) {
    res.status(500).send("Server Error");
  }
});

function searchWardrobeItems(query) {
  const sql = "SELECT * FROM wardrobe WHERE name LIKE ? OR color LIKE ?";
  const likeQuery = `%${query}%`;
  return pool
    .query(sql, [likeQuery, likeQuery])
    .then(([results]) => results)
    .catch((error) => {
      throw error;
    });
}

app.get("/stats", (req, res) => {
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
    res.render("files/outfit", { wardrobeItems });
  } catch (error) {
    res.status(500).send("Server Error");
  }
});

app.get("/community", async (req, res) => {
  try {
    const wardrobeItems = await getWardrobeItems();
    res.render("files/community", { wardrobeItems });
  } catch (error) {
    res.status(500).send("Server Error");
  }
});
app.get("/styling", async (req, res) => {
  try {
    const wardrobeItems = await getWardrobeItems();
    
    res.render("files/styling", { wardrobeItems });
  } catch (error) {
    res.status(500).send("Server Error");
  }
});
app.get("/ecoshop", async (req, res) => {
  res.render("files/ecoshop");
});