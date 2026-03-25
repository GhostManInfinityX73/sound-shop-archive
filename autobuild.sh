#!/bin/bash

# The directory to watch (current directory)
TARGET="./"

echo "Watching for changes in $TARGET..."

# Watch for modify, create, or delete events
inotifywait -m -r -e modify,create,delete,move "$TARGET" --exclude ".git" |
    while read path action file; do
        echo "Change detected in $file. Syncing to GitHub..."
        
        git add .
        git commit -m "Real-time update: $file ($action)"
        git push origin main
        
        echo "Done. EdgeOne will now pull the update."
    done

