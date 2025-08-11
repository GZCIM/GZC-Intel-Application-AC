#!/bin/bash

# Production Certificate Generation Script for GZC Intel Application
# Supports both staging (development) and production environments

set -euo pipefail

# Configuration
DOMAIN="${DOMAIN:-gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io}"
ENVIRONMENT="${ENVIRONMENT:-production}"
EMAIL="${EMAIL:-admin@gzc.com}"
CERT_DIR="/etc/nginx/certs"
AZURE_KEYVAULT="${AZURE_KEYVAULT:-gzc-finma-keyvault}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to generate self-signed certificates for development
generate_self_signed() {
    log_info "Generating self-signed certificates for development..."
    
    mkdir -p "$CERT_DIR"
    
    # Generate private key
    openssl genrsa -out "$CERT_DIR/privkey.pem" 4096
    
    # Generate certificate signing request
    openssl req -new -key "$CERT_DIR/privkey.pem" \
        -out "$CERT_DIR/cert.csr" \
        -subj "/C=US/ST=State/L=City/O=GZC/OU=IT/CN=$DOMAIN"
    
    # Generate self-signed certificate
    openssl x509 -req -days 365 \
        -in "$CERT_DIR/cert.csr" \
        -signkey "$CERT_DIR/privkey.pem" \
        -out "$CERT_DIR/fullchain.pem"
    
    # Copy as chain for consistency
    cp "$CERT_DIR/fullchain.pem" "$CERT_DIR/chain.pem"
    
    # Generate DH parameters for perfect forward secrecy
    if [ ! -f "$CERT_DIR/dhparam.pem" ]; then
        log_info "Generating DH parameters (this may take a few minutes)..."
        openssl dhparam -out "$CERT_DIR/dhparam.pem" 2048
    fi
    
    log_warning "Self-signed certificates generated. These are for development only!"
}

# Function to generate Let's Encrypt certificates for production
generate_lets_encrypt() {
    log_info "Generating Let's Encrypt certificates for production..."
    
    # Check if certbot is installed
    if ! command -v certbot &> /dev/null; then
        log_error "Certbot is not installed. Installing..."
        if [ -f /etc/debian_version ]; then
            apt-get update && apt-get install -y certbot
        elif [ -f /etc/alpine-release ]; then
            apk add --no-cache certbot
        else
            log_error "Unsupported OS. Please install certbot manually."
            exit 1
        fi
    fi
    
    # Determine if we should use staging
    STAGING_FLAG=""
    if [ "$ENVIRONMENT" = "staging" ]; then
        STAGING_FLAG="--staging"
        log_warning "Using Let's Encrypt staging environment"
    fi
    
    # Generate certificates using webroot method
    certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email \
        --force-renewal \
        $STAGING_FLAG \
        -d "$DOMAIN"
    
    # Copy certificates to expected location
    cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$CERT_DIR/privkey.pem"
    cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$CERT_DIR/fullchain.pem"
    cp "/etc/letsencrypt/live/$DOMAIN/chain.pem" "$CERT_DIR/chain.pem"
    
    # Generate DH parameters if not exists
    if [ ! -f "$CERT_DIR/dhparam.pem" ]; then
        log_info "Generating DH parameters..."
        openssl dhparam -out "$CERT_DIR/dhparam.pem" 2048
    fi
    
    log_info "Let's Encrypt certificates generated successfully"
}

# Function to import certificates from Azure Key Vault
import_from_azure() {
    log_info "Importing certificates from Azure Key Vault..."
    
    # Check if Azure CLI is installed
    if ! command -v az &> /dev/null; then
        log_error "Azure CLI is not installed"
        exit 1
    fi
    
    # Check if logged in to Azure
    if ! az account show &> /dev/null; then
        log_error "Not logged in to Azure. Please run 'az login'"
        exit 1
    fi
    
    mkdir -p "$CERT_DIR"
    
    # Download certificate
    log_info "Downloading certificate from Key Vault..."
    az keyvault certificate download \
        --vault-name "$AZURE_KEYVAULT" \
        --name gzc-intel-ssl \
        --file "$CERT_DIR/fullchain.pem" \
        --encoding PEM
    
    # Download private key
    log_info "Downloading private key from Key Vault..."
    az keyvault secret show \
        --vault-name "$AZURE_KEYVAULT" \
        --name gzc-intel-ssl \
        --query value -o tsv | base64 -d > "$CERT_DIR/privkey.pem"
    
    # Extract chain
    openssl x509 -in "$CERT_DIR/fullchain.pem" -out "$CERT_DIR/chain.pem"
    
    # Generate DH parameters if not exists
    if [ ! -f "$CERT_DIR/dhparam.pem" ]; then
        log_info "Generating DH parameters..."
        openssl dhparam -out "$CERT_DIR/dhparam.pem" 2048
    fi
    
    log_info "Certificates imported from Azure Key Vault successfully"
}

# Function to validate certificates
validate_certificates() {
    log_info "Validating certificates..."
    
    # Check if all required files exist
    REQUIRED_FILES=("privkey.pem" "fullchain.pem" "chain.pem" "dhparam.pem")
    for file in "${REQUIRED_FILES[@]}"; do
        if [ ! -f "$CERT_DIR/$file" ]; then
            log_error "Missing required file: $CERT_DIR/$file"
            return 1
        fi
    done
    
    # Validate certificate
    if ! openssl x509 -in "$CERT_DIR/fullchain.pem" -text -noout &> /dev/null; then
        log_error "Invalid certificate: $CERT_DIR/fullchain.pem"
        return 1
    fi
    
    # Validate private key
    if ! openssl rsa -in "$CERT_DIR/privkey.pem" -check &> /dev/null; then
        log_error "Invalid private key: $CERT_DIR/privkey.pem"
        return 1
    fi
    
    # Check certificate expiration
    EXPIRY=$(openssl x509 -in "$CERT_DIR/fullchain.pem" -noout -enddate | cut -d= -f2)
    log_info "Certificate expires: $EXPIRY"
    
    # Check if certificate matches private key
    CERT_MODULUS=$(openssl x509 -in "$CERT_DIR/fullchain.pem" -noout -modulus | md5sum)
    KEY_MODULUS=$(openssl rsa -in "$CERT_DIR/privkey.pem" -noout -modulus | md5sum)
    
    if [ "$CERT_MODULUS" != "$KEY_MODULUS" ]; then
        log_error "Certificate and private key do not match!"
        return 1
    fi
    
    log_info "Certificate validation successful"
    return 0
}

# Function to set proper permissions
set_permissions() {
    log_info "Setting proper permissions..."
    
    # Set ownership and permissions
    chmod 600 "$CERT_DIR/privkey.pem"
    chmod 644 "$CERT_DIR/fullchain.pem" "$CERT_DIR/chain.pem" "$CERT_DIR/dhparam.pem"
    
    # If running in Docker, ensure nginx user can read
    if [ -f /.dockerenv ]; then
        chown -R nginx:nginx "$CERT_DIR"
    fi
    
    log_info "Permissions set successfully"
}

# Function to setup auto-renewal for Let's Encrypt
setup_auto_renewal() {
    log_info "Setting up auto-renewal..."
    
    # Create renewal script
    cat > /etc/cron.daily/renew-certificates <<'EOF'
#!/bin/bash
certbot renew --quiet --no-self-upgrade --post-hook "nginx -s reload"
EOF
    
    chmod +x /etc/cron.daily/renew-certificates
    
    log_info "Auto-renewal configured"
}

# Main execution
main() {
    log_info "Starting certificate generation for domain: $DOMAIN"
    log_info "Environment: $ENVIRONMENT"
    
    case "$1" in
        self-signed)
            generate_self_signed
            ;;
        letsencrypt)
            generate_lets_encrypt
            if [ "$ENVIRONMENT" = "production" ]; then
                setup_auto_renewal
            fi
            ;;
        azure)
            import_from_azure
            ;;
        validate)
            validate_certificates
            exit $?
            ;;
        *)
            log_error "Usage: $0 {self-signed|letsencrypt|azure|validate}"
            echo "  self-signed: Generate self-signed certificates (development)"
            echo "  letsencrypt: Generate Let's Encrypt certificates (production)"
            echo "  azure:       Import certificates from Azure Key Vault"
            echo "  validate:    Validate existing certificates"
            exit 1
            ;;
    esac
    
    # Always validate after generation
    if validate_certificates; then
        set_permissions
        log_info "Certificate setup completed successfully!"
    else
        log_error "Certificate validation failed!"
        exit 1
    fi
}

# Run main function with all arguments
main "${1:-self-signed}"