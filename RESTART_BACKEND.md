# How to Restart the Backend Server

## Steps:

1. **Stop the current server:**
   - Go to the terminal where the backend is running
   - Press `Ctrl+C` to stop it

2. **Restart the server:**
   ```powershell
   cd "C:\Users\sarha\Downloads\searchengine(dec)\Search-Engine"
   python -m uvicorn backend.http_api:app --host 127.0.0.1 --port 8000 --reload
   ```

3. **Verify it's working:**
   - Open browser to: http://127.0.0.1:8000/docs
   - You should see the API documentation
   - Look for the `/search` endpoint - it should show the new response format with `matches`, `total_matches`, `time_ms`, `cache`

4. **Test the endpoint:**
   - First upload a document via the frontend
   - Then search - it should now work correctly

