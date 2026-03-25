import subprocess, sys

result = subprocess.run(
    [sys.executable, 'test_ocr.py'],
    capture_output=True, text=True, encoding='utf-8', errors='replace',
    cwd=r'c:\Apache24\htdocs\PULSO\backend'
)
print(result.stdout)
print(result.stderr)
print("EXIT CODE:", result.returncode)
