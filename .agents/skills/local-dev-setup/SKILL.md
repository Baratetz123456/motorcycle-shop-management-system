---
name: local-dev-setup
description: Assists the user in bringing the entire Docker and Python environment online locally.
---

# Local Dev Setup Skill

Use this skill when the user asks for help starting the environment, running the project, or if they encounter connection refused errors indicating the services aren't running.

## Workflow

1.  **Check Docker**: Instruct the user to ensure the Docker daemon is running on their Windows machine.
2.  **Start Infrastructure**: Provide the command to start the databases and broker:
    ```bash
    cd d:\POS
    docker-compose up -d
    ```
3.  **Start Backend Services**: Advise the user to open multiple terminal tabs (or a multiplexer) and run the following for each service (`auth`, `inventory`, `sales`, `repairs`):
    ```bash
    cd d:\POS\backend
    uvicorn <name>_service.main:app --port <port> --reload
    ```
4.  **Start Frontend**: Provide the frontend command:
    ```bash
    cd d:\POS\frontend
    npm run dev
    ```
5.  **Verify**: Ask the user to visit `http://localhost:3000` to verify the frontend, and `http://localhost:8080/api/v1/auth/health` (or similar) to verify KrakenD is routing correctly.
