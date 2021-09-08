import User from "../models/user";
import { hashPassword, comparePassword } from "../utils/auth";
import jwt from "jsonwebtoken";
import AWS from "aws-sdk";
import { nanoid } from "nanoid";

// AWS configuration

const awsConfig = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
  apiVersion: process.env.AWS_API_VERSION,
};

const SES = new AWS.SES(awsConfig);

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validations

    if (!name) return res.status(400).json({ msg: "Name is required" });
    if (!password || password.length < 6) {
      return res.status(400).json({
        msg: "Password is required and should be min 6 caracters long",
      });
    }
    let userExist = await User.findOne({ email }).exec();
    if (userExist)
      return res.status(400).json({ msg: "Email is already registered" });

    // hash password

    const hashedPasswords = await hashPassword(password);

    // register

    const user = await new User({
      name,
      email,
      password: hashedPasswords,
    }).save();

    return res.status(200).json({ msg: "User created successfully" });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ msg: "Try again" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // check if our db has user whit the email

    const user = await User.findOne({ email }).exec();
    if (!user)
      return res.status(400).json({ msg: "this email is not registered" });

    // check password

    const match = await comparePassword(password, user.password);

    if (!match) return res.status(500).json({ msg: "password is incorrect" });
    // create JWT
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    user.password = undefined;

    // send token in cookie

    res.cookie("token", token, {
      httpOnly: true,
    });

    res.status(200).json(user);
  } catch (err) {
    console.log(err);
    return res.status(400).json({ msg: "try again" });
  }
};

export const logout = async (req, res) => {
  try {
    res.clearCookie("token");
    return res.status(200).json({ msg: "Signout success" });
  } catch (err) {
    console.log(err);
  }
};

export const currentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password").exec();
    console.log("current user", user);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.log(err);
  }
};

/* export const sendTestEmail = async (req, res) => {
  try {
    const params = {
      Source: process.env.EMAIL_FROM,
      Destination: {
        ToAddresses: ["manuelmoironaws@gmail.com"],
      },
      ReplyToAddresses: [process.env.EMAIL_FROM],
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: `<html>
                     <h1>Reset password link</h1>
                    <p>Please use the following link to reset your password</p>
                    </html>`,
          },
        },
        Subject: {
          Charset: "UTF-8",
          Data: "Password reset link",
        },
      },
    };

    const emailSent = SES.sendEmail(params).promise();
    console.log(emailSent);

    emailSent
      .then((data) => {
        console.log(data);
        res.status(200).json({ ok: true });
      })
      .catch((err) => console.log(err));
  } catch (err) {
    res.status(500).json({ err });
  }
}; */

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const shortCode = nanoid(6).toUpperCase();
    const user = await User.findOneAndUpdate(
      { email },
      { passwordResetCode: shortCode }
    );
    if (!user) return res.status(400).json({ msg: "User not found" });

    // prepare for email
    const params = {
      Source: process.env.EMAIL_FROM,
      Destination: {
        ToAddresses: [email],
      },
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: `<html>
              <h1> Reset password </h1>
              <p> Use this code to reset yout password</p>
              <h2 style="color:red;">${shortCode} </h2>
              <i>edemy.com</i>

              </html>`,
          },
        },
        Subject: {
          Charset: "UTF-8",
          Data: "Reset Password",
        },
      },
    };
    const emailSent = SES.sendEmail(params).promise();
    emailSent
      .then((data) => {
        console.log(data);
        res.status(200).json({ ok: true });
      })
      .catch((err) => console.log(err));
  } catch (err) {
    return res.status(500).json({ msg: err });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    const hashedPassword = await hashPassword(newPassword);
    const user = User.findOneAndUpdate(
      { email, passwordResetCode: code },
      {
        password: hashedPassword,
        passwordResetCode: "",
      }
    ).exec();
    res.status(200).json({ ok: true });
  } catch (err) {
    console.log(err);
    return res.status(400).json({ msg: "Error! Try again!" });
  }
};
