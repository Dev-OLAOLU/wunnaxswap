#!/bin/bash
cd "$(dirname "$0")"
echo ""
echo "  Wunnaxswap local server"
echo "  Open:  http://127.0.0.1:5500/signin.html"
echo "  (Press Ctrl+C to stop)"
echo ""
python3 -m http.server 5500
