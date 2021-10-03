import User from "../models/user";
import Course from "../models/course";
import QueryString from "query-string";

// Stripe configuration

const stripe = require("stripe")(process.env.STRIPE_SECRET);

export const makeInstructor = async (req, res) => {
  try {
    // 1. find user from db
    const user = await User.findById(req.user._id).exec();

    // 2. if user dont have stripe_account_id yet, then create new
    if (!user.stripe_account_id) {
      const account = await stripe.account.create({ type: "express" });
      user.stripe_account_id = account.id;
      user.save();
    }
    // 3. create account link based on account id ( for frontend to complete onboarding)
    let accountLink = await stripe.accountLinks.create({
      account: user.stripe_account_id,
      refresh_url: process.env.STRIPE_REDIRECT_URL,
      return_url: process.env.STRIPE_REDIRECT_URL,
      type: "account_onboarding",
    });
    // 4. pre-fill any info such as email (optional), then send url response to fronend
    accountLink = Object.assign(accountLink, {
      "stripe_user[email]": user.email,
    });
    // 5. then send the account link as json response to fronend
    res.send(`${accountLink.url}?${QueryString.stringify(accountLink)}`);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ err });
  }
};

export const getAccountStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).exec();
    const account = await stripe.accounts.retrieve(user.stripe_account_id);

    if (!account.charges_enabled) {
      return res.status(401).send("unauthorized");
    } else {
      const statusUpdated = await User.findByIdAndUpdate(
        user._id,
        {
          stripe_seller: account,
          $addToSet: { role: "Instructor" },
        },
        { new: true }
      ).exec();

      statusUpdated.password = null;
      res.json(statusUpdated);
    }
  } catch (err) {
    console.log(err);
  }
};

export const currentInstructor = async (req, res) => {
  try {
    let user = await User.findById(req.user._id).select("-password").exec();

    if (!user.role.includes("Instructor")) {
      return res.sendStatus(403);
    } else {
      return res.status(200).json({ ok: true });
    }
  } catch (err) {
    console.log(err);
  }
};

export const instructorCourses = async (req, res) => {
  try {
    const courses = await Course.find({ instructor: req.user._id })
      .sort({ createdAt: -1 })
      .exec();
    return res.status(200).json(courses);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ err });
  }
};

export const studentCount = async (req, res) => {
  try {
    const users = await User.find({ courses: req.body.courseId })
      .select("_id")
      .exec();
    res.status(200).json(users);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
};

export const instructorBalance = async (req, res) => {
  try {
    let user = await User.findById(req.user._id).exec();
    const balance = await stripe.balance.retrieve({
      stripeAccount: user.stripe_account_id,
    });
    res.status(200).json(balance);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
};

export const instructorPayoutSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).exec();
    const loginLink = await stripe.accounts.createLoginLink(
      user.stripe_seller.id,
      { redirect_url: process.env.STRIPE_SETTINGS_REDIRECT }
    );

    res.status(200).json(loginLink.url);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
};
