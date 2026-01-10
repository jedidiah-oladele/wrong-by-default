#!/bin/bash
cd "$(dirname "$0")/../backend" || exit 1

source .venv/bin/activate

uvicorn main:app --reload --host 0.0.0.0 --port 3000
