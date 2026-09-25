import asyncio
from app.core.database import engine, Base, init_db_schemas

def handler(event, context):
    """
    AWS Lambda Migration Handler invoked by GitHub Actions CI/CD.
    Executes schema migrations and table setup inside the private VPC.
    """
    try:
        loop = asyncio.get_event_loop()
        if loop.is_closed():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    try:
        loop.run_until_complete(init_db_schemas(engine, Base.metadata))
        return {
            "statusCode": 200,
            "status": "SUCCESS",
            "message": "Database schemas and zero-cost state tables initialized successfully."
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "status": "ERROR",
            "error": str(e)
        }
