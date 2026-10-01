#!/bin/bash
set -e

echo "Installing dependencies..."
pip install -r backend/requirements.txt

echo "Fetching Prisma binary..."
python -m prisma py fetch

echo "Generating Prisma client..."
cd backend && prisma-client-py generate

echo "Pushing schema to database..."
prisma-client-py db push --skip-generate

echo "Build complete!"
