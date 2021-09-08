import User from "../models/user";
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
