import mongoose from "mongoose";
const { Schema } = mongoose;
const { ObjectId } = Schema;

const lessonSchema = new Schema(
  {
    title: {
      type: String,
      trim: true,
      minlength: 3,
      maxlength: 320,
      required: true,
    },
    slug: {
      type: String,
      lowercase: true,
    },
    content: {
      type: {},
      minlength: 200,
    },
    video_link: {},
    free_preview: {
      type: Boolean,
      default: false,
    },
  },
  { timestramps: true }
);

const courseSchema = new Schema(
  {
    title: {
      type: String,
      trim: true,
      minlength: 3,
      maxlength: 320,
      required: true,
    },
    slug: {
      type: String,
      lowercase: true,
    },
    description: {
      type: {},
      minlength: 200,
      required: true,
    },
    price: {
      type: Number,
      default: 9.99,
    },
    image: {
      type: {},
    },
    category: String,
    published: {
      type: Boolean,
      default: false,
    },
    padi: {
      type: Boolean,
      default: true,
    },
    instructor: {
      type: ObjectId,
      ref: "User",
      required: true,
    },
    lessons: [lessonSchema],
  },
  { timestramps: true }
);

export default mongoose.model("Course", courseSchema);
