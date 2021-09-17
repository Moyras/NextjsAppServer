import express from "express";
import cors from "cors";
import { readdirSync } from "fs";
import mongoose from "mongoose";
import csrf from "csurf";
import cookieParser from "cookie-parser";
const morgan = require("morgan");
require("dotenv").config();

const csrfProtection = csrf({ cookie: true });

// create express app

const app = express();

// DB connection

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("DB connected"))
  .catch((e) => console.log(e));

// apply middlewares

app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(morgan("dev"));
app.use(cookieParser());

// routes
readdirSync("./routes").map((r) => app.use("/api", require(`./routes/${r}`)));

// csrf

app.use(csrfProtection);

app.get("/api/csrf-token", (req, res) => {
  try {
    res.status(200).json({ csrfToken: req.csrfToken() });
  } catch (error) {
    res.status(500).json({ msg: error });
  }
});

// port

const port = process.env.PORT || 8000;

app.listen(port, () => {
  console.log(`app is runing on port ${port}`);
});
