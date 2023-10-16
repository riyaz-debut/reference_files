# start with base image
FROM mysql:8.0.29

# import data into container
# COPY ./integradb.sql /docker-entrypoint-initdb.d/
ADD integradump.sql /docker-entrypoint-initdb.d

