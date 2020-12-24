const mongoose = require("mongoose");

const HomeworkSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  section: {
    type: Number,
    required: true,
  },
  date: {
    type: String,
    required: true,
  },
  fileName: {
    type: String,
  },
  teacherId: {
    type: String,
    required: true,
  },
  teacherName: {
    type: String,
    required: true,
  },
});
const Homework = mongoose.model("homeworks", HomeworkSchema);
module.exports = Homework;
