#!/usr/bin/env python3
"""
Merge duplicate user configurations in Cosmos DB
Fixes the issue where Safari and Chrome created different configs
"""

import os
from azure.identity import DefaultAzureCredential
from azure.cosmos import CosmosClient
from datetime import datetime

# Cosmos DB configuration
COSMOS_ENDPOINT = "https://cosmos-research-analytics-prod.documents.azure.com:443/"
DATABASE_ID = "gzc-intel-app-config"
CONTAINER_ID = "user-configurations"

def main():
    # Initialize Cosmos client
    credential = DefaultAzureCredential()
    cosmos_client = CosmosClient(COSMOS_ENDPOINT, credential=credential)
    database = cosmos_client.get_database_client(DATABASE_ID)
    container = database.get_container_client(CONTAINER_ID)
    
    # Query all documents
    query = "SELECT * FROM c"
    items = list(container.query_items(query=query, enable_cross_partition_query=True))
    
    # Group by email
    by_email = {}
    for item in items:
        email = item.get('userEmail', '')
        if email:
            if email not in by_email:
                by_email[email] = []
            by_email[email].append(item)
    
    # Process each email with multiple configs
    for email, configs in by_email.items():
        if len(configs) > 1:
            print(f"\nFound {len(configs)} configs for {email}")
            
            # Find the most recent or most complete config
            best_config = None
            max_tabs = 0
            latest_timestamp = None
            
            for config in configs:
                timestamp = config.get('timestamp', '')
                tabs = config.get('tabs', [])
                
                # Deduplicate tabs within this config
                seen_ids = set()
                unique_tabs = []
                for tab in tabs:
                    if tab.get('id') not in seen_ids:
                        seen_ids.add(tab.get('id'))
                        unique_tabs.append(tab)
                
                tab_count = len(unique_tabs)
                
                print(f"  - Config ID: {config['id']}, Tabs: {tab_count}, Timestamp: {timestamp}")
                
                # Choose config with most tabs or latest timestamp
                if tab_count > max_tabs or (tab_count == max_tabs and timestamp > (latest_timestamp or '')):
                    best_config = config
                    best_config['tabs'] = unique_tabs  # Use deduplicated tabs
                    max_tabs = tab_count
                    latest_timestamp = timestamp
            
            if best_config:
                # Update the best config to use email as ID
                best_config['id'] = email
                best_config['userId'] = email
                best_config['timestamp'] = datetime.utcnow().isoformat()
                
                print(f"  → Keeping config with {len(best_config['tabs'])} tabs, using email as ID: {email}")
                
                # Delete all old configs
                for config in configs:
                    if config['id'] != email:
                        try:
                            container.delete_item(item=config['id'], partition_key=config['id'])
                            print(f"  ✓ Deleted old config: {config['id']}")
                        except Exception as e:
                            print(f"  ✗ Failed to delete {config['id']}: {e}")
                
                # Upsert the merged config with email as ID
                try:
                    container.upsert_item(body=best_config)
                    print(f"  ✓ Saved merged config with ID: {email}")
                except Exception as e:
                    print(f"  ✗ Failed to save merged config: {e}")

if __name__ == "__main__":
    main()