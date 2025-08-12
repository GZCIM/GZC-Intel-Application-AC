#!/bin/bash
# Environment variable injection script
# Replaces placeholders in built frontend with actual environment variables at runtime

echo "🔧 Starting environment variable injection..."
echo "🕒 Timestamp: $(date)"
echo "📂 Current directory: $(pwd)"
echo "📁 Contents of /var/www/html/assets:"
ls -la /var/www/html/assets/ || echo "❌ Assets directory not found"

# Define the variables to inject
CLIENT_ID="${VITE_CLIENT_ID:-}"
TENANT_ID="${VITE_TENANT_ID:-}"
INSIGHTS_CONN="${VITE_APPLICATIONINSIGHTS_CONNECTION_STRING:-}"

echo "🔍 Environment variables check:"
echo "   VITE_CLIENT_ID length: ${#CLIENT_ID}"
echo "   VITE_TENANT_ID length: ${#TENANT_ID}"
echo "   VITE_APPLICATIONINSIGHTS_CONNECTION_STRING length: ${#INSIGHTS_CONN}"

if [ -z "$CLIENT_ID" ] || [ -z "$TENANT_ID" ]; then
    echo "❌ ERROR: Missing required environment variables"
    echo "   VITE_CLIENT_ID: '$CLIENT_ID'"
    echo "   VITE_TENANT_ID: '$TENANT_ID'"
    exit 1
fi

echo "📝 Injecting CLIENT_ID: ${CLIENT_ID}"
echo "📝 Injecting TENANT_ID: ${TENANT_ID}"
echo "📝 Injecting App Insights (first 50 chars): ${INSIGHTS_CONN:0:50}..."

# Find and replace in all JS files
file_count=0
processed_count=0

for file in /var/www/html/assets/*.js; do
    file_count=$((file_count + 1))
    echo "🔍 Checking file: $file"
    
    if [ -f "$file" ]; then
        processed_count=$((processed_count + 1))
        echo "📄 Processing $file (size: $(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo "unknown") bytes)"
        
        # Check if placeholders exist before replacement
        placeholder_count=$(grep -c "PLACEHOLDER" "$file" 2>/dev/null || echo "0")
        echo "   Found $placeholder_count placeholders in $file"
        
        # Replace CLIENT_ID and TENANT_ID environment variables (including object property syntax)
        echo "   Replacing CLIENT_ID placeholder..."
        sed -i.bak "s|VITE_CLIENT_ID:|\"$CLIENT_ID\":|g" "$file" 2>/dev/null || {
            echo "   ❌ sed failed for CLIENT_ID property in $file"
        }
        sed -i.bak "s|VITE_CLIENT_ID\b|$CLIENT_ID|g" "$file" 2>/dev/null || {
            echo "   ❌ sed failed for CLIENT_ID standalone in $file"
        }
        
        echo "   Replacing TENANT_ID placeholder..."
        sed -i.bak "s|VITE_TENANT_ID:|\"$TENANT_ID\":|g" "$file" 2>/dev/null || {
            echo "   ❌ sed failed for TENANT_ID property in $file"
        }
        sed -i.bak "s|VITE_TENANT_ID\b|$TENANT_ID|g" "$file" 2>/dev/null || {
            echo "   ❌ sed failed for TENANT_ID standalone in $file"
        }
        
        # Also replace explicit PLACEHOLDER versions if they exist
        sed -i.bak "s|VITE_TENANT_ID_PLACEHOLDER|$TENANT_ID|g" "$file" 2>/dev/null
        sed -i.bak "s|VITE_CLIENT_ID_PLACEHOLDER|$CLIENT_ID|g" "$file" 2>/dev/null
        
        if [ -n "$INSIGHTS_CONN" ]; then
            echo "   Replacing App Insights connection string..."
            # Use printf to create a safe sed script with escaped characters
            printf "s#VITE_APPLICATIONINSIGHTS_CONNECTION_STRING_PLACEHOLDER#%s#g" "$INSIGHTS_CONN" | sed -i.bak -f - "$file" 2>/dev/null || {
                echo "   ❌ sed with printf failed, trying perl approach..."
                perl -pi -e "s/VITE_APPLICATIONINSIGHTS_CONNECTION_STRING_PLACEHOLDER/\Q$INSIGHTS_CONN\E/g" "$file" 2>/dev/null || {
                    echo "   ❌ perl failed, trying python approach..."
                    python3 -c "
import sys, re
with open('$file', 'r') as f: content = f.read()
content = content.replace('VITE_APPLICATIONINSIGHTS_CONNECTION_STRING_PLACEHOLDER', '''$INSIGHTS_CONN''')
with open('$file', 'w') as f: f.write(content)
" 2>/dev/null || {
                        echo "   ❌ All replacement methods failed for App Insights in $file"
                    }
                }
            }
        fi
        
        # Verify replacement worked
        remaining_placeholders=$(grep -c "PLACEHOLDER" "$file" 2>/dev/null || echo "0")
        if [ "$remaining_placeholders" -gt 0 ]; then
            echo "   ⚠️ Warning: $remaining_placeholders placeholders still remain in $file"
            echo "   First remaining placeholder:"
            grep -o "[A-Z_]*PLACEHOLDER[A-Z_]*" "$file" | head -1
        else
            echo "   ✅ All placeholders replaced in $file"
        fi
        
        # Clean up backup file
        rm -f "${file}.bak" 2>/dev/null
    else
        echo "   ❌ File does not exist or is not readable: $file"
    fi
done

echo "📊 Summary: Found $file_count files, processed $processed_count files"

echo "✅ Environment variable injection complete"