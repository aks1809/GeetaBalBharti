const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const ObjectId = require("mongodb").ObjectID;
const User = require("./models/User");
const Gallery = require("./models/Gallery");
const Homework = require("./models/Homework");
const db = require("./config/keys").MongoURI;
const bcrypt = require("bcryptjs");
const session = require("express-session");
const passport = require("passport");
const flash = require("express-flash");
const fs = require("fs");
const { promisify } = require("util");
const unlinkAsync = promisify(fs.unlink);
const path = require("path");
const multer = require("multer");
const nodemailer = require("nodemailer");
const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    const ext = path.extname(file.originalname);
    let dir;
    if (ext === ".jpg" || ext === ".jpeg" || ext === ".png") {
      dir = "./public/profiles";
    } else {
      dir = "./public/homework";
    }
    callback(null, dir);
  },
  filename: function (req, file, callback) {
    callback(
      null,
      file.fieldname + Date.now() + path.extname(file.originalname)
    );
  },
});
const upload = multer({
  storage: storage,
});
const {
  ensureAuthenticated,
  ensureNotAuthenticated,
} = require("./config/auth");

require("./config/passport")(passport);

// configurations
const app = express();
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: false }));
app.use(express.static(__dirname + "/public"));
app.use(cors());
mongoose
  .connect(db, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
  })
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));
app.use(
  session({
    secret: "secret",
    resave: true,
    saveUninitialized: true,
  })
);
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
const PORT = process.env.PORT || 3000;
const {
  TeachersPassword,
  StudentsPassword,
  NodeMailerPassword,
  NodeMailerReceiver,
} = require("./config/keys");

// nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: NodeMailerPassword,
});

// routes
app.get("/", (req, res) => {
  const d = new Date();
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const nd = new Date(utc + 3600000 * +5.5);
  const date = nd.toLocaleString().slice(0, 5).replace("/", "-");
  User.find({ dob: { $regex: ".*" + date } }, (err, data) => {
    if (err) {
      req.flash("error", "Unable to get data");
      res.redirect("/");
    } else {
      res.render("Home", {
        isLoggedIn: req.isAuthenticated(),
        birthdays: data,
      });
    }
  });
});
app.get("/academics", (req, res) =>
  res.render("Academics", { isLoggedIn: req.isAuthenticated() })
);
app.get("/gallery", (req, res) => {
  Gallery.find({}, (err, data) => {
    if (err) {
      req.flash("error", "Unable to get data");
      res.redirect("/");
    } else {
      res.render("Gallery", {
        isLoggedIn: req.isAuthenticated(),
        events: data,
      });
    }
  });
});
app.get("/contactUs", (req, res) =>
  res.render("Contact-Us", { isLoggedIn: req.isAuthenticated() })
);
app.get("/profile", ensureAuthenticated, (req, res) => {
  if (req.user.isTeacher || req.user.isAdmin) {
    res.redirect("/admin");
  } else {
    const { year, section } = req.user;
    Homework.find({ year: year, section: section }, (err, data) => {
      if (err) {
        req.flash("error", "Error fetching assignments");
        res.render("Profile", {
          isLoggedIn: req.isAuthenticated(),
          user: req.user,
          assignments: [],
        });
      } else {
        res.render("Profile", {
          isLoggedIn: req.isAuthenticated(),
          user: req.user,
          assignments: data,
        });
      }
    });
  }
});
app.get("/login", ensureNotAuthenticated, (req, res) =>
  res.render("Login", { isLoggedIn: req.isAuthenticated() })
);
app.get("/admin", ensureAuthenticated, (req, res) => {
  Homework.find({ teacherId: req.user._id }, (err, data) => {
    if (err) {
      req.flash("error", "Error fetching assignments");
      res.render("Admin", {
        isLoggedIn: req.isAuthenticated(),
        user: req.user,
        assignments: [],
      });
    } else {
      res.render("Admin", {
        isLoggedIn: req.isAuthenticated(),
        user: req.user,
        assignments: data,
      });
    }
  });
});

app.get("/gallery/:id", (req, res) => {
  Gallery.findOne(ObjectId(req.params.id), (err, data) => {
    if (err) {
      req.flash("error", "Unable to get data");
    } else {
      res.render("GalleryParticular", {
        isLoggedIn: req.isAuthenticated(),
        event: data,
      });
    }
  });
});

app.post("/admin", ensureAuthenticated, upload.any(), (req, res) => {
  const {
    name,
    email,
    phone,
    batch,
    section,
    dob,
    folder,
    qty,
    details,
    id,
    fileName,
  } = req.body;
  if (typeof batch !== "undefined") {
    // teacher
    if (!email) {
      // homework
      if (!id) {
        if (!name || !batch || !section) {
          req.flash("error", "Fill all the fields");
          res.redirect("/admin");
        } else {
          const year = new Date().getFullYear() - parseInt(batch);
          const date = new Date().toISOString().slice(0, 10);
          const newHomework = new Homework({
            title: name,
            year,
            section,
            date,
            fileName: "fileName",
            teacherId: req.user._id,
            teacherName: req.user.name,
          });
          upload.single("homework")(req, res, (err) => {
            if (err) {
              req.flash("error", err);
              res.redirect("/admin");
            } else {
              newHomework.fileName = req.files[0].filename;
              newHomework
                .save()
                .then(
                  req.flash("error", "Assignment added"),
                  res.redirect("/admin")
                )
                .catch((err) => {
                  req.flash("error", err);
                  res.redirect("/admin");
                });
            }
          });
        }
      } else {
        if (!fileName) {
          req.flash("error", "Unexpected error");
          res.redirect("/admin");
        } else {
          Homework.deleteOne({ _id: new ObjectId(id) }, (err, data) => {
            if (err) {
              req.flash("error", "Assignment not found");
              res.redirect("/admin");
            } else {
              fs.unlink(`public/homework/${fileName}`, (err) => {
                if (err && err.code == "ENOENT") {
                  req.flash("error", "Assignment doesn't exists");
                  res.redirect("/admin");
                } else if (err) {
                  req.flash("error", "Assignment deletion error");
                  res.redirect("/admin");
                } else {
                  req.flash("error", "Assignment deleted");
                  res.redirect("/admin");
                }
              });
            }
          });
        }
      }
    } else {
      // register student
      if (!name || !email || !phone || !batch || !section || !dob) {
        req.flash("error", "Fill all the fields");
        res.redirect("/admin");
      } else {
        User.findOne({ email: email }).then(async (user) => {
          if (user) {
            await unlinkAsync(req.files[0].path);
            req.flash("error", "Student exists");
            res.redirect("/admin");
          } else {
            const year = new Date().getFullYear() - parseInt(batch);
            const password = StudentsPassword;
            const imageAddress = "userimage";
            const newUser = new User({
              name,
              email,
              phone,
              password,
              year,
              section,
              dob,
              isTeacher: false,
              isAdmin: false,
              imageAddress,
            });
            bcrypt.genSalt(10, function (err, salt) {
              bcrypt.hash(password, salt, function (err, hash) {
                if (err) throw err;
                newUser.password = hash;
                upload.single("imageName")(req, res, (err) => {
                  if (err) {
                    req.flash("error", err);
                    res.redirect("/admin");
                  } else {
                    newUser.imageAddress = req.files[0].filename;
                    newUser
                      .save()
                      .then(
                        req.flash("error", "Student registered"),
                        res.redirect("/admin")
                      )
                      .catch((err) => {
                        req.flash("error", err);
                        res.redirect("/admin");
                      });
                  }
                });
              });
            });
          }
        });
      }
    }
  } else {
    //admin
    if (!folder) {
      if (!name || !email || !phone) {
        req.flash("error", "Fill all the fields");
        res.redirect("/admin");
      } else {
        User.findOne({ email: email, isTeacher: true }).then((user) => {
          if (user) {
            req.flash("error", "Teacher exists");
            res.redirect("/admin");
          } else {
            const password = TeachersPassword;
            const newUser = new User({
              name,
              email,
              phone,
              password,
              isTeacher: true,
              isAdmin: false,
            });
            bcrypt.genSalt(10, function (err, salt) {
              bcrypt.hash(password, salt, function (err, hash) {
                if (err) throw err;
                newUser.password = hash;
                newUser
                  .save()
                  .then(
                    req.flash("error", "Teacher added"),
                    res.redirect("/admin")
                  )
                  .catch((err) => console.log(err));
              });
            });
          }
        });
      }
    } else {
      if (!qty || !details) {
        req.flash("error", "Fill all the fields");
        res.redirect("/admin");
      } else {
        Gallery.findOne({ folder: folder }).then((data) => {
          if (data) {
            req.flash("error", "Folder already exists");
            res.redirect("/admin");
          } else {
            const newGallery = new Gallery({
              name,
              folder,
              details,
              qty,
            });
            newGallery
              .save()
              .then(req.flash("error", "Event created"), res.redirect("/admin"))
              .catch((err) => {
                req.flash("error", err), res.redirect("/admin");
              });
          }
        });
      }
    }
  }
});

app.post("/login", (req, res, next) => {
  passport.authenticate("local", { failureFlash: true }, (err, user, info) => {
    if (err) {
      req.flash("error", info.message);
      return next(err);
    }
    if (!user) {
      req.flash("error", info.message);
      return res.redirect("/login");
    }
    req.logIn(user, (err) => {
      if (err) {
        req.flash("error", info.message);
        return next(err);
      }
      if (user.isTeacher) return res.redirect("/admin");
      else return res.redirect("/profile");
    });
  })(req, res, next);
});

app.post("/contactUs", (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    req.flash("error", "Fill all the fields");
    res.redirect("/contactUs");
  } else {
    const mailOptions = {
      from: NodeMailerPassword.user,
      to: NodeMailerReceiver,
      subject: `Query from ${name}`,
      html: `<p>${message}</p><p>${email}</p>`,
    };
    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        req.flash("error", "Unable to send message");
        res.redirect("/contactUs");
      } else {
        req.flash("error", "Message sent");
        res.redirect("/contactUs");
      }
    });
  }
});

app.get("/logout", (req, res) => {
  req.logOut();
  req.flash("error", "Logged out successfully");
  res.redirect("/login");
});

app.use((req, res, next) => {
  next({
    status: 404,
    message: "Not Found",
  });
});

app.use((err, req, res, next) => {
  if (err.status === 404) {
    return res.render("404", { isLoggedIn: req.isAuthenticated() });
  }

  if (err.status === 500) {
    return res.render("error", { isLoggedIn: req.isAuthenticated() });
  }
  next();
});

// listening
app.listen(PORT, () => console.log(`Server started on port: ${PORT}`));
