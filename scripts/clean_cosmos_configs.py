#!/usr/bin/env python3
"""
Clean and enhance Cosmos DB user configurations
- Remove duplicates
- Standardize IDs on email
- Merge configs from different browsers
- Add missing fields
"""

import json
from azure.identity import DefaultAzureCredential
from azure.cosmos import CosmosClient
from datetime import datetime
from typing import Dict, List, Any

# Cosmos DB configuration
COSMOS_ENDPOINT = "https://cosmos-research-analytics-prod.documents.azure.com:443/"
DATABASE_ID = "gzc-intel-app-config"
CONTAINER_ID = "user-configurations"

def deduplicate_tabs(tabs: List[Dict]) -> List[Dict]:
    """Remove duplicate tabs by ID"""
    seen_ids = set()
    unique_tabs = []
    for tab in tabs:
        tab_id = tab.get('id')
        if tab_id and tab_id not in seen_ids:
            seen_ids.add(tab_id)
            unique_tabs.append(tab)
    return unique_tabs

def merge_configs(configs: List[Dict]) -> Dict:
    """Merge multiple configs for the same user"""
    if not configs:
        return None
    
    # Start with the config that has the most tabs
    configs.sort(key=lambda x: len(x.get('tabs', [])), reverse=True)
    merged = configs[0].copy()
    
    # Collect all unique tabs from all configs
    all_tabs = []
    for config in configs:
        all_tabs.extend(config.get('tabs', []))
    
    # Deduplicate and set tabs
    merged['tabs'] = deduplicate_tabs(all_tabs)
    
    # Use the latest timestamp
    latest_timestamp = max(c.get('timestamp', '') for c in configs)
    merged['timestamp'] = latest_timestamp or datetime.utcnow().isoformat()
    
    # Merge preferences (take non-default values)
    for config in configs[1:]:
        prefs = config.get('preferences', {})
        if prefs.get('theme') and prefs.get('theme') != 'dark':
            merged.setdefault('preferences', {})['theme'] = prefs['theme']
        if prefs.get('language') and prefs.get('language') != 'en':
            merged.setdefault('preferences', {})['language'] = prefs['language']
    
    return merged

def standardize_config(config: Dict, email: str) -> Dict:
    """Standardize config structure"""
    return {
        "id": email,  # Always use email as ID
        "userId": email,
        "userEmail": email,
        "tabs": deduplicate_tabs(config.get('tabs', [])),
        "layouts": config.get('layouts', []),
        "preferences": config.get('preferences', {
            "theme": "dark",
            "language": "en"
        }),
        "timestamp": config.get('timestamp', datetime.utcnow().isoformat()),
        "type": "user-config",
        "version": "2.0"  # Add version for tracking
    }

def main():
    print("🔍 Connecting to Cosmos DB...")
    
    # Initialize Cosmos client
    credential = DefaultAzureCredential()
    cosmos_client = CosmosClient(COSMOS_ENDPOINT, credential=credential)
    database = cosmos_client.get_database_client(DATABASE_ID)
    container = database.get_container_client(CONTAINER_ID)
    
    print("📥 Loading all configurations...")
    
    # Query all documents
    query = "SELECT * FROM c"
    items = list(container.query_items(query=query, enable_cross_partition_query=True))
    print(f"Found {len(items)} total configurations")
    
    # Group by email
    by_email = {}
    orphaned = []  # Configs without email
    
    for item in items:
        email = item.get('userEmail', '').lower().strip()
        if email and '@' in email:
            if email not in by_email:
                by_email[email] = []
            by_email[email].append(item)
        else:
            orphaned.append(item)
    
    print(f"\n📊 Analysis:")
    print(f"- Unique users: {len(by_email)}")
    print(f"- Orphaned configs (no email): {len(orphaned)}")
    
    # Process each user
    updated_configs = []
    
    for email, configs in by_email.items():
        print(f"\n👤 Processing {email}:")
        print(f"  - Found {len(configs)} config(s)")
        
        # Show current state
        for cfg in configs:
            tabs = cfg.get('tabs', [])
            print(f"    • ID: {cfg['id'][:20]}... | Tabs: {len(tabs)} | Unique tabs: {len(deduplicate_tabs(tabs))}")
        
        # Merge and standardize
        merged = merge_configs(configs)
        standardized = standardize_config(merged, email)
        
        print(f"  ✨ After merge: {len(standardized['tabs'])} unique tabs")
        
        updated_configs.append(standardized)
    
    # Handle orphaned configs
    if orphaned:
        print(f"\n⚠️  Found {len(orphaned)} orphaned configs:")
        for cfg in orphaned:
            print(f"  - ID: {cfg.get('id', 'unknown')}, Tabs: {len(cfg.get('tabs', []))}")
    
    # Ask for confirmation
    print(f"\n📝 Ready to update {len(updated_configs)} user configurations")
    response = input("Proceed with update? (yes/no): ")
    
    if response.lower() == 'yes':
        print("\n🔄 Updating Cosmos DB...")
        
        # First, delete all old configs
        for item in items:
            try:
                container.delete_item(item=item['id'], partition_key=item['id'])
                print(f"  ✓ Deleted old config: {item['id'][:30]}...")
            except Exception as e:
                print(f"  ✗ Failed to delete {item['id'][:30]}...: {e}")
        
        # Then insert clean configs
        for config in updated_configs:
            try:
                container.upsert_item(body=config)
                print(f"  ✓ Saved clean config for {config['userEmail']}")
            except Exception as e:
                print(f"  ✗ Failed to save {config['userEmail']}: {e}")
        
        print("\n✅ Configuration cleanup complete!")
        
        # Summary
        print("\n📈 Summary:")
        print(f"  - Processed: {len(items)} original configs")
        print(f"  - Created: {len(updated_configs)} clean configs")
        print(f"  - Removed: {len(items) - len(updated_configs)} duplicate/orphaned configs")
    else:
        print("❌ Operation cancelled")

if __name__ == "__main__":
    main()