import json
import time
import os

log_file = 'activity_log.json'

print("--- Real-Time Sound Shop Activity ---")
print("Press Ctrl+C to stop\n")

# Move to the end of the file
with open(log_file, 'r') as f:
    f.seek(0, os.SEEK_END)
    
    while True:
        line = f.readline()
        if not line:
            time.sleep(0.1)
            continue
            
        try:
            data = json.loads(line)
            # Formatting the output
            time_stamp = data.get('timestamp', 'N/A')
            user = data.get('email', 'Guest')
            action = data.get('action', 'Action')
            item = data.get('item', 'Unknown')
            
            print(f"[{time_stamp}] {user} -> {action}: {item}")
        except:
            continue

