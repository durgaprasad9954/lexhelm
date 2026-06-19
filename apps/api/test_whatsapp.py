import asyncio
import os
import sys
import logging

# Add the app to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from app.services.whatsapp_service import whatsapp_service

logging.basicConfig(level=logging.INFO)

async def main():
    print(f"Token present: {bool(settings.whatsapp_access_token)}")
    print(f"Phone ID: {settings.whatsapp_phone_number_id}")
    
    response = whatsapp_service.send_text(
        to="917013858977",
        body="Test message from LexHelm"
    )
    
    print(f"Response: {response}")

if __name__ == "__main__":
    asyncio.run(main())
