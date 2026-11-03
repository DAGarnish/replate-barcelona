CREATE TABLE IF NOT EXISTS quote_requests (
  id          BIGSERIAL PRIMARY KEY,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  page        TEXT NOT NULL,          -- en, fr, nl or de
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  email       TEXT,
  town        TEXT NOT NULL,
  car         TEXT NOT NULL,
  origin      TEXT,
  co2         INTEGER,
  moving      TEXT,
  lights      TEXT,
  collect     BOOLEAN NOT NULL DEFAULT true,
  notes       TEXT,
  message     TEXT,
  email_sent  BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS quote_requests_created_at_idx ON quote_requests (created_at DESC);
