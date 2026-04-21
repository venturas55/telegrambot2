export function simpleAuthMiddleware(req, res, next) {
    const allowedPaths = ['/login'];

    if (!req.session.isAuthenticated && !allowedPaths.includes(req.path)) {
        return res.redirect('/login');
    }

    next();
}

