-- Local development only: the API's limited key.
-- On Neon it is created once in the SQL Editor, never with the "New role" button.
-- Its rights are given by the app_role migration.
CREATE ROLE efactura_app LOGIN PASSWORD 'efactura_app';
