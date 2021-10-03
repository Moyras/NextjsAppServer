import AWS from "aws-sdk";
import { nanoid } from "nanoid";
import Course from "../models/course";
import slugify from "slugify";
import { readFileSync } from "fs";
import User from "../models/user";
import completed from "../models/completed";
const stripe = require("stripe")(process.env.STRIPE_SECRET);

const awsConfig = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
  apiVersion: process.env.AWS_API_VERSION,
};

const S3 = new AWS.S3(awsConfig);

export const uploadImage = async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json("No Image");

    // prepare the image
    const base64Data = new Buffer.from(
      image.replace(/^data:image\/\w+;base64,/, ""),
      "base64"
    );

    const type = image.split(";")[0].split("/")[1];

    // image params

    const params = {
      Bucket: "moiron-bucket",
      Key: `${nanoid()}.${type}`,
      Body: base64Data,
      ACL: "public-read",
      ContentEncoding: "base64",
      ContentType: `image/${type}`,
    };

    // upload to s3

    S3.upload(params, (err, data) => {
      if (err) {
        console.log(err);
        return res.sendStatus(400);
      }
      res.status(200).send(data);
    });
  } catch (err) {
    res.status(500).json({ err });
  }
};
export const removeImage = async (req, res) => {
  try {
    const { image } = req.body;
    const params = {
      Bucket: image.Bucket,
      Key: image.Key,
    };

    // send remove request to s3

    S3.deleteObject(params, (err, data) => {
      if (err) {
        console.log(err);
        return res.sendStatus(400);
      }
      res.status(200).json({ ok: true });
    });
  } catch (err) {
    console.log(err);
  }
};

export const createCourse = async (req, res) => {
  try {
    const { title, description, price, image, category, paid } = req.body;
    const instructor = req.user._id;
    const alreadyExist = await Course.findOne({
      slug: slugify(title.toLowerCase()),
    });

    if (alreadyExist) return res.status(400).send("Title is taken");

    const course = await new Course({
      slug: slugify(title),
      title,
      description,
      price,
      image,
      category,
      paid,
      instructor,
    });
    course.save();

    res.status(200).json(course);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ err });
  }
};

export const readCourse = async (req, res) => {
  try {
    const course = await Course.findOne({ slug: req.params.slug })
      .populate("instructor", "_id name")
      .exec();

    return res.status(200).json(course);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ err });
  }
};

export const uploadVideo = async (req, res) => {
  try {
    if (req.user._id != req.params.instructorId) {
      return res.status(400).json({ msg: "Unauthorized" });
    }
    const { video } = req.files;
    if (!video) return res.status(400).json({ msg: "No video" });

    const params = {
      Bucket: "moiron-bucket",
      Key: `${nanoid()}.${video.type.split("/")[1]}`,
      Body: readFileSync(video.path),
      ACL: "public-read",
      ContentType: video.type,
    };

    S3.upload(params, (err, data) => {
      if (err) {
        console.log(err);
        return res.status(400).json({ err });
      }

      return res.status(200).json(data);
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ err });
  }
};

export const removeVideo = async (req, res) => {
  try {
    if (req.user._id != req.params.instructorId) {
      return res.status(400).json({ msg: "Unauthorized" });
    }
    const video = req.body;
    if (!video) return res.status(400).json({ msg: "No video" });

    const params = {
      Bucket: video.Bucket,
      Key: video.Key,
    };

    // send remove request to s3

    S3.deleteObject(params, (err, data) => {
      if (err) {
        console.log(err);
        return res.sendStatus(400);
      }
      res.status(200).json({ ok: true });
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ err });
  }
};

export const addLesson = async (req, res) => {
  try {
    const { slug, instructorId } = req.params;
    const { title, content, video } = req.body;

    if (req.user._id != instructorId) {
      return res.status(400).json({ msg: "Unahutorized" });
    }

    const updated = await Course.findOneAndUpdate(
      { slug },
      { $push: { lessons: { title, content, video, slug: slugify(title) } } },
      { new: true }
    )
      .populate("instructor", "_id name")
      .exec();
    res.status(200).json(updated);
  } catch (err) {
    console.log(err);
    return res.status(400).json({ err });
  }
};

export const updateCourse = async (req, res) => {
  try {
    const { slug } = req.params;
    const data = req.body;
    const course = await Course.findOne({ slug }).exec();

    if (req.user._id != course.instructor) {
      return res.status(400).json({ msg: "Unauthorized" });
    }

    const updated = await Course.findOneAndUpdate({ slug }, data, {
      new: true,
    }).exec();

    return res.status(200).json(updated);
  } catch (err) {
    console.log(err);
    res.status(500).json({ err });
  }
};

export const removeImagedb = async (req, res) => {
  try {
    const { slug } = req.params;
    const course = await Course.findOne({ slug }).exec();

    if (req.user._id != course.instructor) {
      return res.status(400).json({ msg: "Unauthorized" });
    }

    const updated = await Course.findOneAndUpdate(
      { slug },
      { image: {} },
      {
        new: true,
      }
    ).exec();

    return res.status(200).json(updated);
  } catch (err) {
    console.log(err);
    res.status(500).json({ err });
  }
};

export const removeLesson = async (req, res) => {
  try {
    const { slug, lessonId } = req.params;
    const course = await Course.findOne({ slug }).select("instructor").exec();

    if (req.user._id != course.instructor._id) {
      return res.status(400).json({ msg: "Unauthorized" });
    }

    const updatedcourse = await Course.findByIdAndUpdate(course._id, {
      $pull: { lessons: { _id: lessonId } },
    }).exec();

    res.status(200).json({ msg: "lesson removed" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ msg: err });
  }
};

export const updateLesson = async (req, res) => {
  try {
    const { slug } = req.params;
    const { _id, title, content, video, free_preview } = req.body;
    const course = await Course.findOne({ slug }).select("instructor").exec();

    if (course.instructor._id != req.user._id) {
      return res.status(400).json({ msg: "Unauthorized" });
    }
    const updated = await Course.updateOne(
      { "lessons._id": _id },
      {
        $set: {
          "lessons.$.title": title,
          "lessons.$.content": content,
          "lessons.$.video": video,
          "lessons.$.free_preview": free_preview,
        },
      },
      { new: true }
    ).exec();
    res.status(200).json({ ok: true });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ msg: "Backend error" });
  }
};

export const publishCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId).select("instructor").exec();
    if (course.instructor._id != req.user._id) {
      return res.status(400).json({ msg: "Unauthorized" });
    }
    const updatedcourse = await Course.findByIdAndUpdate(
      course._id,
      { published: true },
      { new: true }
    ).exec();

    res.status(200).json(updatedcourse);
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: err });
  }
};

export const unpublishCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    console.log(req.params);
    const course = await Course.findById(courseId).select("instructor").exec();
    if (course.instructor._id != req.user._id) {
      return res.status(400).json({ msg: "Unauthorized" });
    }
    const updatedcourse = await Course.findByIdAndUpdate(
      course._id,
      { published: false },
      { new: true }
    ).exec();

    res.status(200).json(updatedcourse);
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: err });
  }
};

export const courses = async (req, res) => {
  try {
    const all = await Course.find({ published: true })
      .populate("instructor", "_id name")
      .exec();

    res.status(200).json(all);
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Server error" });
  }
};

export const chechEnrollment = async (req, res) => {
  try {
    const { courseId } = req.params;

    // find courses of the currently logged in user
    const user = await User.findById(req.user._id).exec();
    // check if course id is found in user courses array
    let ids = [];
    let length = user.courses && user.courses.length;
    for (let i = 0; i < length; i++) {
      ids.push(user.courses[i].toString());
    }

    res.status(200).json({
      status: ids.includes(courseId),
      course: await Course.findById(courseId).exec(),
    });
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
};

export const freeEnrollment = async (req, res) => {
  try {
    // check if course is free or paid
    const course = await Course.findById(req.params.courseId).exec();
    if (course.paid) return;
    const result = await User.findByIdAndUpdate(
      req.user._id,
      {
        $addToSet: { courses: course._id },
      },
      { new: true }
    ).exec();
    return res.status(200).json({ msg: "Successfully enrollment", course });
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
};

export const paidEnrollment = async (req, res) => {
  try {
    // check if course if free or paid
    const course = await Course.findById(req.params.courseId)
      .populate("instructor")
      .exec();
    if (!course.paid) return;

    // application fee 30%
    const fee = (course.price * 30) / 100;
    // create stripe session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          name: course.title,
          amount: Math.round(course.price.toFixed(2) * 100),
          currency: "usd",
          quantity: 1,
        },
      ],
      // charge buyer and transfer remaining balance to seller (after fee)
      payment_intent_data: {
        application_fee_amount: Math.round(fee.toFixed(2) * 100),
        transfer_data: {
          destination: course.instructor.stripe_account_id,
        },
      },
      // redirect url after succesful payment
      success_url: `${process.env.STRIPE_SUCCESS_URL}/${course._id}`,
      cancel_url: `${process.env.STRIPE_CANCEL_URL}`,
    });

    await User.findByIdAndUpdate(req.user._id, {
      stripeSession: session,
    }).exec();

    res.status(200).json(session.id);
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
};

export const stripeSuccess = async (req, res) => {
  try {
    // find course
    const course = await Course.findById(req.params.courseId).exec();
    // get user from db to get stripe session id
    const user = await User.findById(req.user._id).exec();
    // if no stripe session return
    if (!user.stripeSession.id) return res.sendStatus(400);
    // retrive
    const session = await stripe.checkout.sessions.retrieve(
      user.stripeSession.id
    );
    if (session.payment_status === "paid") {
      await User.findByIdAndUpdate(user._id, {
        $addToSet: { courses: course._id },
        $set: { stripeSession: {} },
      }).exec();
    }
    res.status(200).json({ success: true, course });
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
};

export const userCourses = async (req, res) => {
  try {
    const { courses } = await User.findById(req.user._id)
      .populate({
        path: "courses",
        select: "_id title image lessons slug",
        populate: { path: "instructor", select: "_id name" },
      })
      .exec();
    res.status(200).json(courses);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
};

export const readFullCourse = async (req, res) => {
  try {
    const course = await Course.findOne({ slug: req.params.slug })
      .populate("instructor", "_id name")
      .exec();

    return res.status(200).json(course);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ err });
  }
};

export const markCompleted = async (req, res) => {
  try {
    const { courseId, lessonId } = req.body;
    // finf if user with that course is already created

    const existing = await completed
      .findOne({
        user: req.user._id,
        course: courseId,
      })
      .exec();

    if (existing) {
      const update = await completed
        .findOneAndUpdate(
          {
            user: req.user._id,
            course: courseId,
          },
          {
            $addToSet: { lessons: lessonId },
          }
        )
        .exec();
      res.status(200).json({ ok: true });
    } else {
      const created = await new completed({
        user: req.user._id,
        course: courseId,
        lessons: lessonId,
      }).save();
      res.status(200).json({ ok: true });
    }
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
};

export const markIncompleted = async (req, res) => {
  try {
    const { courseId, lessonId } = req.body;

    const updated = await completed
      .findOneAndUpdate(
        {
          user: req.user._id,
          course: req.body.courseId,
        },
        { $pull: { lessons: lessonId } }
      )
      .exec();
    res.status(200).json({ ok: true });
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
};

export const listCompleted = async (req, res) => {
  try {
    const list = await completed
      .findOne({
        user: req.user._id,
        course: req.body.courseId,
      })
      .exec();
    if (list) {
      return res.status(200).json(list.lessons);
    } else {
      return res.status(200).json([]);
    }
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
};
