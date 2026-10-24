"""
TrustVault Backend Launcher.
Ensures correct sys.path and runs Uvicorn on http://127.0.0.1:8000.

Usage:
    python run_backend.py
"""

import sys
import os
from pathlib import Path

# Add project root to sys.path automatically
ROOT_DIR = Path(__file__).resolve().parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

if __name__ == "__main__":
    import uvicorn
    print("\n" + "=" * 60)
    print("  TrustVault Secure Backend Server")
    print("  URL: http://127.0.0.1:8000")
    print("  API Documentation: http://127.0.0.1:8000/docs")
    print("=" * 60 + "\n")
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)
