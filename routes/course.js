import express from "express";
import formidable from "express-formidable";

const router = express.Router();

// middlewares

import { isInstructor, requireSignin } from "../middlewares";

//controllers
import {
  uploadImage,
  removeImage,
  createCourse,
  readCourse,
  uploadVideo,
  removeVideo,
  addLesson,
} from "../controllers/course";

// image
router.post("/course/upload-image", uploadImage);
router.post("/course/remove-image", removeImage);

// course

router.post("/course", requireSignin, isInstructor, createCourse);
router.get("/course/:slug", readCourse);
router.post(
  "/course/video-upload/:instructorId",
  requireSignin,
  formidable(),
  uploadVideo
);
router.post("/course/video-remove/:instructorId", requireSignin, removeVideo);
router.post("/course/lesson/:slug/:instructorId", requireSignin, addLesson);

module.exports = router;
