import sys
import os
sys.path.append('c:\\Apache24\\htdocs\\PULSO\\backend')

from database import SessionLocal
import analytics_service

db = SessionLocal()
try:
    print("Testing forecast...")
    forecast = analytics_service.get_forecast(db)
    print(f"Forecast entries: {len(forecast)}")
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
