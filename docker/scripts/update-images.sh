#!/bin/bash
# Weekly security update script for Docker images
# Pulls latest base images, scans for vulnerabilities, and rebuilds if safe

set -e

echo "===== Docker Image Security Update ====="
echo "Started at: $(date)"

# Pull latest base images
echo ""
echo "[1/5] Pulling latest base images..."
docker pull ubuntu:22.04
docker pull kalilinux/kali-rolling

# Scan for vulnerabilities using Trivy
echo ""
echo "[2/5] Scanning images for vulnerabilities..."

# Check if Trivy is installed, if not provide installation instructions
if ! command -v trivy &> /dev/null; then
    echo "Trivy not found. Installing..."
    # For Windows/WSL
    if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
        echo "Please install Trivy manually from: https://github.com/aquasecurity/trivy/releases"
        exit 1
    else
        # For Linux
        wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo apt-key add -
        echo "deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" | sudo tee -a /etc/apt/sources.list.d/trivy.list
        sudo apt-get update
        sudo apt-get install trivy -y
    fi
fi

# Scan base images
trivy image --severity HIGH,CRITICAL ubuntu:22.04
UBUNTU_SCAN=$?

trivy image --severity HIGH,CRITICAL kalilinux/kali-rolling  
KALI_SCAN=$?

# Check scan results
if [ $UBUNTU_SCAN -ne 0 ] || [ $KALI_SCAN -ne 0 ]; then
    echo ""
    echo "⚠️  CRITICAL vulnerabilities found in base images!"
    echo "Please review the scan results above."
    echo "Skipping rebuild for safety."
    exit 1
fi

echo "✓ No critical vulnerabilities found. Safe to proceed."

# Rebuild lab images
echo ""
echo "[3/5] Rebuilding lab images..."
cd "$(dirname "$0")/.."  # Go to docker directory
docker-compose build --no-cache

# Test in staging (if staging compose file exists)
if [ -f "docker-compose.staging.yml" ]; then
    echo ""
    echo "[4/5] Testing in staging environment..."
    docker-compose -f docker-compose.staging.yml up -d
    
    # Wait for containers to be healthy
    sleep 30
    
    # Run integration tests if script exists
    if [ -f "./scripts/integration-tests.sh" ]; then
        ./scripts/integration-tests.sh
        TEST_RESULT=$?
    else
        echo "No integration tests found, skipping..."
        TEST_RESULT=0
    fi
    
    # Stop staging
    docker-compose -f docker-compose.staging.yml down
    
    if [ $TEST_RESULT -ne 0 ]; then
        echo "❌ Staging tests failed. Not deploying to production."
        exit 1
    fi
else
    echo "[4/5] No staging environment configured, skipping tests..."
fi

# Deploy to production (manual approval in production, auto in dev)
echo ""
echo "[5/5] Deployment..."
if [ "$NODE_ENV" = "production" ]; then
    echo "⚠️  Production deployment requires manual approval."
    echo "Run: docker-compose up -d --force-recreate"
else
    echo "Restarting development containers..."
    docker-compose up -d --force-recreate
fi

echo ""
echo "✓ Image update completed successfully!"
echo "Finished at: $(date)"
