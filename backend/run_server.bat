@echo off
echo ====================================
echo Wood Loss Prediction API
echo ====================================
echo.

cd /d "%~dp0"

if not exist "venv_sklearn16\Scripts\activate.bat" (
    echo Tao moi virtual environment...
    py -3.11 -m venv venv_sklearn16
    echo.
    echo Cai dat dependencies...
    call venv_sklearn16\Scripts\pip.bat install -r requirements.txt
    echo.
)

echo Kich hoat virtual environment...
call venv_sklearn16\Scripts\activate.bat

echo.
echo Khoi dong server tren port 8002...
echo URL: http://localhost:8002
echo Docs: http://localhost:8002/docs
echo.

uvicorn main:app --host 127.0.0.1 --port 8002 --reload
