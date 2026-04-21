export function simpleAuthMiddleware(req, res, next) {
  // rutas públicas (whitelist)
  const publicPaths = ["/login", "/alta-nueva"];

  if (publicPaths.includes(req.path)) {
    return next();
  }

  if (req.session.isAuthenticated) {
    return next();
  }

  res.redirect("/login");
}