export function simpleAuthMiddleware(req, res, next) {
  // rutas públicas (whitelist)
  const publicPaths = [
    "/login",
    "/alta-nueva",
    "/api/auth/login",
    "/api/auth/session"
  ];

  if (publicPaths.includes(req.path)) {
    return next();
  }

  if (req.session.isAuthenticated) {
    return next();
  }

  if (req.path === "/api" || req.path.startsWith("/api/")) {
    return res.status(401).json({
      ok: false,
      message: "La sesión ha expirado. Inicia sesión de nuevo."
    });
  }

  res.redirect("/login");
}