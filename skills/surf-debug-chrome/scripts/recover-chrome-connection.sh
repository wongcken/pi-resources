#!/bin/bash
# Surf Chrome Connection Recovery Script
# Run this when you get "Error: Connection refused. Native host not running."
#
# Usage: bash ~/.surf/workflows/recover-chrome-connection.sh

set -e

echo "=== Surf Chrome Connection Recovery ==="
echo ""

# Check if surf socket exists
if [ -S "/tmp/surf.sock" ]; then
    echo "✓ Surf socket exists at /tmp/surf.sock"
    ls -la /tmp/surf.sock
else
    echo "✗ Surf socket NOT found at /tmp/surf.sock"
fi

# Check if Chrome is running
CHROME_PID=$(pgrep -x "Google Chrome" || echo "")
if [ -n "$CHROME_PID" ]; then
    echo ""
    echo "✓ Chrome is running (PID: $CHROME_PID)"
    
    # Check which profile is active
    PROFILE_INFO=$(ps auxww | grep "Google Chrome.app/Contents/MacOS/Google Chrome" | grep -o "profile-directory=[^ ]*" || echo "Default")
    echo "  Profile: $PROFILE_INFO"
else
    echo ""
    echo "✗ Chrome is NOT running"
fi

# Check native messaging host
echo ""
echo "Checking Native Messaging Host..."
HOST_FILE="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts/surf.browser.host.json"
if [ -f "$HOST_FILE" ]; then
    echo "✓ Host manifest exists: $HOST_FILE"
    cat "$HOST_FILE"
else
    echo "✗ Host manifest NOT found at: $HOST_FILE"
fi

# Check extension data location
echo ""
echo "Checking extension data..."
find ~/Library/Application\ Support/Google/Chrome -name "cmcmdnajppdfghcejohkojcgpdcednnn" -type d 2>/dev/null | while read extdir; do
    echo "  Found extension data: $extdir"
done

# Recovery steps
echo ""
echo "=== Recovery Steps ==="

# Try to find Chrome with the surf extension
CHROME_WITH_SURF=$(find ~/Library/Application\ Support/Google/Chrome -name "Preferences" -exec grep -l "cmcmdnajppdfghcejohkojcgpdcednnn" {} \; 2>/dev/null | head -1)
if [ -n "$CHROME_WITH_SURF" ]; then
    PROFILE_DIR=$(dirname "$CHROME_WITH_SURF")
    PROFILE_NAME=$(basename "$PROFILE_DIR")
    echo ""
    echo "Surf extension found in: $PROFILE_NAME"
    
    # Check if native messaging host exists in this profile
    if [ ! -f "$PROFILE_DIR/NativeMessagingHosts/surf.browser.host.json" ]; then
        echo "  Copying native messaging host to $PROFILE_NAME..."
        mkdir -p "$PROFILE_DIR/NativeMessagingHosts"
        cp "$HOST_FILE" "$PROFILE_DIR/NativeMessagingHosts/" 2>/dev/null || echo "  (Failed to copy - may need manual copy)"
    fi
    
    # Restart Chrome with correct profile
    echo ""
    echo "→ Restarting Chrome with $PROFILE_NAME..."
    killall "Google Chrome" 2>/dev/null || true
    sleep 2
    open -na "Google Chrome" --args --profile-directory="$PROFILE_NAME" --remote-debugging-port=9222
    echo "  Chrome restarting..."
    sleep 5
    
    # Verify connection
    echo ""
    echo "→ Testing surf connection..."
    if surf tab.list >/dev/null 2>&1; then
        echo "  ✓ Surf is now connected!"
    else
        echo "  ✗ Still not connected. Waiting 5 more seconds..."
        sleep 5
        if surf tab.list >/dev/null 2>&1; then
            echo "  ✓ Surf is now connected!"
        else
            echo "  ✗ Connection failed. Check Chrome extension is enabled."
        fi
    fi
else
    echo ""
    echo "✗ Surf extension not found in any Chrome profile."
    echo "  You may need to install the surf Chrome extension first."
fi

echo ""
echo "=== Recovery Complete ==="
