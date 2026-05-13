@echo off
cd /d "%~dp0"
call venv_sklearn16\Scripts\activate
uvicorn main:app --reload --port 8000
