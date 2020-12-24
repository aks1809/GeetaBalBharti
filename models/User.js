const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  year: {
    type: Number,
  },
  section: {
    type: Number,
  },
  dob: {
    type: String,
  },
  isTeacher: {
    type: Boolean,
    required: true,
  },
  isAdmin: {
    type: Boolean,
    required: true,
  },
  imageAddress: {
    type: String,
  },
});
const User = mongoose.model("users", UserSchema);
module.exports = User;
