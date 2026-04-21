import db from './db.js';

export const getUserByTelegramId = async (telegramId) => {
  const [rows] = await db.query(
    `SELECT 
        u.telegram_id,
        u.username,
        u.nombre,
        u.fecha_alta,
        s.id AS subscripcion_id,
        s.estado AS subscripcion_estado,
        s.start_date,
        s.end_date,
        (s.estado = 'activo' AND s.end_date > NOW()) AS has_access
        FROM usuarios u 
        LEFT JOIN subscripciones s 
        on u.telegram_id=s.telegram_id 
        WHERE u.telegram_id = ?`,
    [telegramId]
  );
  return rows[0];
};


/* export const hasValidPlan = (user) => {
  if (!user) return false;

  if (user.activo !== 1) return false;
  if (user.bloqueado === 1) return false;

  // Free siempre permitido
  if (user.plan === 'free') return true;

  // Debe estar pagado
  if (user.estado_pago !== 'pagado') return false;

  if (!user.fecha_expiracion) return false;

  return new Date(user.fecha_expiracion) > new Date();
}; */