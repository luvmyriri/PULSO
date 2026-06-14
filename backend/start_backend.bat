@echo off
echo Starting PULSO Backend Server...
"C:\Users\Val\AppData\Local\Python\bin\python.exe" -m uvicorn main:app --reload --host 0.0.0.0 --port 33159
pause
