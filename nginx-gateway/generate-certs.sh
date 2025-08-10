#!/bin/bash

# Certificate generation script for GZC Intel Application
# For development/testing: generates self-signed certificates
# For production: use Let's Encrypt or Azure certificates

CERT_DIR="./certs"
DOMAIN="${1:-gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io}"

echo "🔐 Setting up SSL/TLS certificates for API Gateway"
echo "Domain: $DOMAIN"

# Create certificate directory
mkdir -p $CERT_DIR

# Generate DH parameters for perfect forward secrecy (this takes time)
if [ ! -f "$CERT_DIR/dhparam.pem" ]; then
    echo "⏳ Generating DH parameters (this may take a few minutes)..."
    openssl dhparam -out $CERT_DIR/dhparam.pem 2048
fi

# For development: Generate self-signed certificate
if [ "$2" == "dev" ]; then
    echo "🔧 Generating self-signed certificate for development..."
    
    # Generate private key
    openssl genrsa -out $CERT_DIR/privkey.pem 2048
    
    # Generate certificate signing request
    openssl req -new -key $CERT_DIR/privkey.pem \
        -out $CERT_DIR/cert.csr \
        -subj "/C=US/ST=State/L=City/O=GZC/CN=$DOMAIN"
    
    # Generate self-signed certificate
    openssl x509 -req -days 365 \
        -in $CERT_DIR/cert.csr \
        -signkey $CERT_DIR/privkey.pem \
        -out $CERT_DIR/fullchain.pem
    
    # Copy as chain for consistency
    cp $CERT_DIR/fullchain.pem $CERT_DIR/chain.pem
    
    echo "✅ Development certificates generated!"
    echo "⚠️  Warning: These are self-signed certificates for development only!"
    
else
    echo "📋 For production, use one of these options:"
    echo ""
    echo "Option 1: Let's Encrypt (Free, Automated)"
    echo "----------------------------------------"
    echo "docker run -it --rm --name certbot \\"
    echo "  -v \"\$(pwd)/certs:/etc/letsencrypt\" \\"
    echo "  -v \"\$(pwd)/certbot:/var/www/certbot\" \\"
    echo "  certbot/certbot certonly --webroot \\"
    echo "  --webroot-path=/var/www/certbot \\"
    echo "  --email your-email@domain.com \\"
    echo "  --agree-tos \\"
    echo "  --no-eff-email \\"
    echo "  -d $DOMAIN"
    echo ""
    echo "Option 2: Azure Key Vault Certificate"
    echo "-------------------------------------"
    echo "# Create certificate in Azure Key Vault"
    echo "az keyvault certificate create \\"
    echo "  --vault-name gzc-finma-keyvault \\"
    echo "  --name gzc-intel-ssl \\"
    echo "  --policy @certificate-policy.json"
    echo ""
    echo "# Download certificate"
    echo "az keyvault certificate download \\"
    echo "  --vault-name gzc-finma-keyvault \\"
    echo "  --name gzc-intel-ssl \\"
    echo "  --file $CERT_DIR/fullchain.pem"
    echo ""
    echo "# Download private key"
    echo "az keyvault secret show \\"
    echo "  --vault-name gzc-finma-keyvault \\"
    echo "  --name gzc-intel-ssl \\"
    echo "  --query value -o tsv | base64 -d > $CERT_DIR/privkey.pem"
fi

# Set proper permissions
chmod 600 $CERT_DIR/privkey.pem
chmod 644 $CERT_DIR/fullchain.pem $CERT_DIR/chain.pem $CERT_DIR/dhparam.pem

echo ""
echo "📁 Certificate files:"
echo "  - $CERT_DIR/privkey.pem    (Private key - keep secure!)"
echo "  - $CERT_DIR/fullchain.pem  (Certificate chain)"
echo "  - $CERT_DIR/chain.pem      (CA chain)"
echo "  - $CERT_DIR/dhparam.pem    (DH parameters)"
echo ""
echo "🚀 Ready to use with nginx-ssl.conf!"