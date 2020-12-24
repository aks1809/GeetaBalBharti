const mongoose = require("mongoose");

const GallerySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  folder: {
    type: String,
    required: true,
  },
  details: {
    type: String,
    required: true,
  },
  qty: {
    type: Number,
    required: true,
  },
});
const Gallery = mongoose.model("gallerys", GallerySchema);
module.exports = Gallery;
