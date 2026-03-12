#!/bin/bash
# Guacamole database initialization script

set -e

echo "Downloading Guacamole schema..."

# Download and execute Guacamole database schema
wget -O /tmp/initdb.sql https://raw.githubusercontent.com/apache/guacamole-client/master/extensions/guacamole-auth-jdbc/modules/guacamole-auth-jdbc-postgresql/schema/001-create-schema.sql

echo "Creating Guacamole database schema..."
psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < /tmp/initdb.sql

echo "Creating default admin user..."
# Default username: guacadmin, password: guacadmin
psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" << EOF
INSERT INTO guacamole_user (username, password_hash, password_salt, password_date)
VALUES ('guacadmin',
        E'\\xCA458A7D494E3BE824F5E1E175A1556C0F8EEF2C2D7DF3633BEC4A29C4411960',
        E'\\xFE24ADC5E11E2B25288D1704ABE67A79E342ECC26064CE69C5B3177795A82264',
        CURRENT_TIMESTAMP);

INSERT INTO guacamole_connection (connection_name, protocol)
VALUES ('AI Lab - Container 1', 'vnc');

INSERT INTO guacamole_connection_parameter (connection_id, parameter_name, parameter_value)
VALUES (1, 'hostname', 'ai-lab-1'),
       (1, 'port', '5901'),
       (1, 'password', 'labpassword');

INSERT INTO guacamole_connection (connection_name, protocol)
VALUES ('Cyber Lab - Container 1', 'vnc');

INSERT INTO guacamole_connection_parameter (connection_id, parameter_name, parameter_value)
VALUES (2, 'hostname', 'cyber-lab-1'),
       (2, 'port', '5901'),
       (2, 'password', 'labpassword');

       (2, 'password', 'labpassword');
EOF


echo "Guacamole database initialized successfully!"
