#!/bin/bash
cd "$(dirname "$0")"
echo "Wunnaxswap → http://localhost:5500/"
python3 -m http.server 5500
