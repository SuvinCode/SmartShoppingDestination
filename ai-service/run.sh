#!/bin/bash
# Get the directory of the script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# Activate the virtual environment
source "$DIR/venv/bin/activate"
# Run the FastAPI server
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
