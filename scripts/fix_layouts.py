#!/usr/bin/env python3
"""
Fix layouts field in Cosmos DB - remove invalid array entries
"""

from azure.identity import DefaultAzureCredential
from azure.cosmos import CosmosClient
from datetime import datetime

# Cosmos DB configuration
COSMOS_ENDPOINT = "https://cosmos-research-analytics-prod.documents.azure.com:443/"
DATABASE_ID = "gzc-intel-app-config"
CONTAINER_ID = "user-configurations"

def main():
    print("🔧 Fixing layouts field...")
    
    # Initialize Cosmos client
    credential = DefaultAzureCredential()
    cosmos_client = CosmosClient(COSMOS_ENDPOINT, credential=credential)
    database = cosmos_client.get_database_client(DATABASE_ID)
    container = database.get_container_client(CONTAINER_ID)
    
    # Query all documents
    query = "SELECT * FROM c"
    items = list(container.query_items(query=query, enable_cross_partition_query=True))
    
    for item in items:
        email = item.get('userEmail', 'unknown')
        layouts = item.get('layouts', [])
        
        print(f"\n👤 {email}:")
        print(f"  Current layouts: {layouts}")
        
        # Fix layouts - should be empty array initially or array of layout objects
        # Remove nested arrays
        if layouts and isinstance(layouts[0], list):
            print(f"  ⚠️ Found nested arrays, cleaning...")
            item['layouts'] = []
        elif layouts and not all(isinstance(l, dict) for l in layouts):
            print(f"  ⚠️ Found non-dict entries, cleaning...")
            item['layouts'] = [l for l in layouts if isinstance(l, dict)]
        
        # Update document
        try:
            container.upsert_item(body=item)
            print(f"  ✅ Fixed")
        except Exception as e:
            print(f"  ❌ Error: {e}")

if __name__ == "__main__":
    main()