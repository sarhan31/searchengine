# Quick Start Guide - Interactive Document Search Engine

## Backend Setup

1. **Navigate to backend directory:**
```bash
cd Search-Engine
```

2. **Install dependencies:**
```bash
pip install -r requirements.txt
```

3. **Start the backend server:**
```bash
python run_server.py
```

The backend will start on `http://127.0.0.1:8000`

## Frontend Setup

1. **Open the frontend:**
   - Simply open `index.html` in your web browser
   - Or use a local server:
     ```bash
     python -m http.server 8001
     ```
     Then open `http://localhost:8001/index.html`

## Usage

1. **Upload a document:**
   - Click "Choose a .txt file" and select a text file
   - Click "Upload" button
   - Wait for success confirmation

2. **Search the document:**
   - Enter your search query in the search box
   - Click "Search" or press Enter
   - View highlighted matches and metadata

## API Endpoints

- **POST** `/upload` - Upload a .txt document
- **GET** `/search?q=<query>` - Search within uploaded document

## Troubleshooting

**"Failed to fetch" error:**
- Make sure the backend server is running on port 8000
- Check that CORS is enabled (it should be by default)
- Verify the backend URL in `app.js` matches your backend address

**Backend won't start:**
- Make sure all dependencies are installed: `pip install -r requirements.txt`
- Check Python version (3.8+ required)
- Verify you're in the `Search-Engine` directory when running `python run_server.py`

