@echo off
echo Starting PULSO Backend Server...
"C:\Users\Val\AppData\Local\Python\bin\python.exe" -m uvicorn main:app --reload --port 33159
pause
