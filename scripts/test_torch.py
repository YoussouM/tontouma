import os
import sys

print(f"Python: {sys.version}")
try:
    import torch
    print(f"Torch version: {torch.__version__}")
    print(f"CUDA available: {torch.cuda.is_available()}")
    print("✅ Torch imported successfully")
except Exception as e:
    print(f"❌ Torch import failed: {e}")
except OSError as e:
    print(f"❌ OS Error during import: {e}")
