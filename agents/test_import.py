
try:
    from google.adk.apps import App
    from google.adk.plugins import ReflectAndRetryToolPlugin
    print("Import successful")
except ImportError as e:
    print(f"Import failed: {e}")
except Exception as e:
    print(f"Error: {e}")
