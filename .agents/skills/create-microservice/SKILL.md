---
name: create-microservice
description: Scaffolds a new FastAPI microservice, updates docker-compose.yml, and configures KrakenD routing.
---

# Microservice Scaffold Skill

Use this skill when the user asks to create or add a new microservice to the POS architecture.

## Workflow

1.  **Ask for the Service Name**: If the user hasn't provided a name (e.g., `shipping_service`), ask for one.
2.  **Create Directories**: Use `run_command` to create `backend/<name>_service`.
3.  **Generate Files**: Use `write_to_file` to create the standard FastAPI boilerplate inside the new directory:
    *   `main.py` (FastAPI app, lifespan event for Outbox worker)
    *   `models.py` (SQLAlchemy Base models, pointing to the shared database)
    *   `schemas.py` (Pydantic schemas)
4.  **Update `docker-compose.yml`**: Add the new service block. Ensure it sets `DATABASE_URL`, `REDIS_URL`, and `RABBITMQ_URL`.
5.  **Update `krakend/krakend.json`**: Add an entry under `endpoints` to route `/api/v1/<name>` to `http://<name>_service:8000`.
6.  **Create Schema**: Update `init.sql` to include `CREATE SCHEMA IF NOT EXISTS <name>;` and the generic `outbox_events` table for that schema.
7.  **Summarize**: Provide a summary of the files created and configurations updated.
