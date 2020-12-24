module.exports = {
  ensureAuthenticated: (req, res, next) => {
    if (req.isAuthenticated()) {
      return next();
    }
    req.flash("error", "Sign in required");
    res.redirect("/login");
  },
  ensureNotAuthenticated: (req, res, next) => {
    if (req.isAuthenticated() && (req.user.isTeacher || req.user.isAdmin)) {
      return res.redirect("/admin");
    }
    if (req.isAuthenticated()) {
      return res.redirect("/profile");
    }
    next();
  },
};
