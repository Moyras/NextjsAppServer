import express from "express";

const router = express.Router();

// middlewares

import { requireSignin } from "../middlewares";

//controllers
import { uploadImage, removeImage } from "../controllers/course";

router.post("/course/upload-image", uploadImage);
router.post("/course/remove-image", removeImage);

module.exports = router;
