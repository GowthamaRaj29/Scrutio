CREATE ROLE scrutio_app
  LOGIN
  PASSWORD 'scrutio_app'
  NOSUPERUSER
  NOBYPASSRLS;

GRANT CONNECT ON DATABASE scrutio TO scrutio_app;
GRANT USAGE ON SCHEMA public TO scrutio_app;
