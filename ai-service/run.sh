#!/bin/bash
# Get the directory of the script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# Activate the virtual environment
source "$DIR/venv/bin/activate"
# Run the FastAPI server
exec uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
