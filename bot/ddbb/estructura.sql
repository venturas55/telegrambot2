CREATE TABLE usuarios(
  telegram_id BIGINT UNSIGNED PRIMARY KEY,
  email VARCHAR(255) DEFAULT NULL,
  username VARCHAR(100),
  nombre VARCHAR(255),
  fecha_alta DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE subscripciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  telegram_id BIGINT UNSIGNED NOT NULL UNIQUE,
  estado ENUM(
    'activo',
    'inactivo',
    'expirado',
    'cancelado',
    'lifetime'
  ) DEFAULT 'inactivo',
  start_date DATETIME,
  end_date DATETIME,
  auto_renew BOOLEAN DEFAULT FALSE,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (telegram_id) REFERENCES usuarios(telegram_id)
);

CREATE TABLE playas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE modelos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE configuraciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  telegram_id BIGINT UNSIGNED NOT NULL UNIQUE,
  alarmas BOOLEAN DEFAULT FALSE,
  hora_aviso TIME,
  playa_id INT NULL,
  modelo_id INT NULL,
  FOREIGN KEY (telegram_id) REFERENCES usuarios(telegram_id),
  FOREIGN KEY (playa_id) REFERENCES playas(id),
  FOREIGN KEY (modelo_id) REFERENCES modelos(id)
);

CREATE TABLE planes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(50) UNIQUE,
  precio DECIMAL(10, 2),
  duracion_dias INT
);

ALTER TABLE
  subscripciones
ADD
  plan_id INT,
ADD
  FOREIGN KEY (plan_id) REFERENCES planes(id);

INSERT INTO
  planes (nombre, precio, duracion_dias)
VALUES
  ('free', 0, NULL),
  ('premium', 4.99, 30),
  ('admin', 0, NULL);

CREATE TABLE pagos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  telegram_id BIGINT UNSIGNED NOT NULL,
  subscripcion_id INT NOT NULL,
  precio DECIMAL(10, 2) NOT NULL,
  fecha_pago DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (telegram_id) REFERENCES usuarios(telegram_id),
  FOREIGN KEY (subscripcion_id) REFERENCES subscripciones(id)
);

INSERT INTO
  usuarios (telegram_id, username, nombre)
VALUES
  (8406513586, 'Guardian', 'Adrian de Haro');

INSERT INTO
  subscripciones (telegram_id, estado)
VALUES
  (8406513586, 'inactivo');

INSERT INTO
  pagos (
    telegram_id,
    subscripcion_id,
    precio,
    fecha_pago
  )
VALUES
  (8406513586, 1, 5, NOW());

UPDATE
  subscripciones
SET
  estado = 'activo',
  start_date = NOW(),
  end_date = DATE_ADD(NOW(), INTERVAL 1 MONTH)
WHERE
  telegram_id = 8406513586;

INSERT INTO
  usuarios (telegram_id, username, nombre)
VALUES
  (8277408556, 'xisme25', 'Jorge Jimenez');

INSERT INTO
  subscripciones (telegram_id, estado)
VALUES
  (8277408556, 'inactivo');

INSERT INTO
  pagos (
    telegram_id,
    subscripcion_id,
    precio,
    fecha_pago
  )
VALUES
  (8277408556, 2, 5, NOW());

UPDATE
  subscripciones
SET
  estado = 'activo',
  start_date = NOW(),
  end_date = DATE_ADD(NOW(), INTERVAL 1 MONTH)
WHERE
  telegram_id = 8277408556;

INSERT INTO
  usuarios (telegram_id, username, nombre)
VALUES
  (8718113457, 'robin', 'Roberto Asinari');

INSERT INTO
  subscripciones (telegram_id, estado)
VALUES
  (8718113457, 'inactivo');

INSERT INTO
  pagos (
    telegram_id,
    subscripcion_id,
    precio,
    fecha_pago
  )
VALUES
  (8718113457, 3, 5, NOW());

UPDATE
  subscripciones
SET
  estado = 'activo',
  start_date = NOW(),
  end_date = DATE_ADD(NOW(), INTERVAL 1 MONTH)
WHERE
  telegram_id = 8718113457;

INSERT INTO
  usuarios (telegram_id, username, nombre)
VALUES
  (1946422850, 'Negro', 'Ignacio Chafer');

INSERT INTO
  subscripciones (telegram_id, estado)
VALUES
  (1946422850, 'inactivo');

INSERT INTO
  pagos (
    telegram_id,
    subscripcion_id,
    precio,
    fecha_pago
  )
VALUES
  (1946422850, 4, 5, NOW());

UPDATE
  subscripciones
SET
  estado = 'activo',
  start_date = NOW(),
  end_date = DATE_ADD(NOW(), INTERVAL 1 MONTH)
WHERE
  telegram_id = 1946422850;

INSERT INTO
  usuarios (telegram_id, username, nombre)
VALUES
  (2048413152, 'Dani', 'Dani kite');

INSERT INTO
  subscripciones (telegram_id, estado)
VALUES
  (2048413152, 'inactivo');

INSERT INTO
  pagos (
    telegram_id,
    subscripcion_id,
    precio,
    fecha_pago
  )
VALUES
  (2048413152, 5, 5, NOW());

UPDATE
  subscripciones
SET
  estado = 'activo',
  start_date = NOW(),
  end_date = DATE_ADD(NOW(), INTERVAL 1 MONTH)
WHERE
  telegram_id = 2048413152;