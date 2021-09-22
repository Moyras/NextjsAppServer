import AWS from "aws-sdk";
import { nanoid } from "nanoid";
import Course from "../models/course";
import slugify from "slugify";
import { readFileSync } from "fs";

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
    const { name: title, description, price, image, category, paid } = req.body;
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
