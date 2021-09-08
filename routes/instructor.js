import { Router } from "express";

const router = Router();

// middleware

import { requireSignin } from "../middlewares";

// controllers

import { makeInstructor, getAccountStatus } from "../controllers/instructor";

router.post("/make-instructor", requireSignin, makeInstructor);
router.post("/get-account-status", requireSignin, getAccountStatus);

module.exports = router;
