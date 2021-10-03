import express from "express";
import formidable from "express-formidable";

const router = express.Router();

// middlewares

import { isInstructor, requireSignin, isEnrolled } from "../middlewares";

//controllers
import {
  uploadImage,
  removeImage,
  createCourse,
  readCourse,
  uploadVideo,
  removeVideo,
  addLesson,
  updateCourse,
  removeImagedb,
  removeLesson,
  updateLesson,
  publishCourse,
  unpublishCourse,
  courses,
  chechEnrollment,
  freeEnrollment,
  paidEnrollment,
  stripeSuccess,
  userCourses,
  readFullCourse,
  markCompleted,
  markIncompleted,
  listCompleted,
} from "../controllers/course";

router.get("/courses", courses);

// image
router.post("/course/upload-image", uploadImage);
router.post("/course/remove-image", removeImage);

// course

router.post("/course", requireSignin, isInstructor, createCourse);
router.put("/course/:slug", requireSignin, updateCourse);
router.put("/course/remove-imagedb/:slug", requireSignin, removeImagedb);
router.get("/course/:slug", readCourse);
router.post(
  "/course/video-upload/:instructorId",
  requireSignin,
  formidable(),
  uploadVideo
);
router.post("/course/video-remove/:instructorId", requireSignin, removeVideo);
router.post("/course/lesson/:slug/:instructorId", requireSignin, addLesson);
router.put("/course/lesson/:slug/:instructorId", requireSignin, updateLesson);
router.put(
  "/course/lesson-remove/:slug/:lessonId",
  requireSignin,
  removeLesson
);

// publish or unpublish

router.put("/course/publish/:courseId", requireSignin, publishCourse);
router.put("/course/unpublish/:courseId", requireSignin, unpublishCourse);

router.get("/check-enrollment/:courseId", requireSignin, chechEnrollment);

// enrolment

router.post("/free-enrollment/:courseId", requireSignin, freeEnrollment);
router.post("/paid-enrollment/:courseId", requireSignin, paidEnrollment);
router.get("/stripe-success/:courseId", requireSignin, stripeSuccess);

// user courses
router.get("/user-courses", requireSignin, userCourses);
router.get("/user/course/:slug", requireSignin, isEnrolled, readFullCourse);

// mark completed

router.post("/mark-completed", requireSignin, markCompleted);
router.post("/mark-incompleted", requireSignin, markIncompleted);

router.post("/list-completed", requireSignin, listCompleted);

module.exports = router;
