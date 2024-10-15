#!/bin/bash

# Define the paths
PROJECT_DIR="C:/Users/kedar/Music/Ass4DevWebApp/webapp-fork"
ENV_FILE="$PROJECT_DIR/.env"
ZIP_OUTPUT="C:/Users/kedar/Music/Ass4DevWebApp/webapp-fork.zip"

# Step 1: Create the .env file with the specified content
echo "Creating .env file at $ENV_FILE"
cat <<EOL > "$ENV_FILE"
APP_PORT=8080

# DEMO DATABASE CREDENTIALS
DB_USERNAME=postgres
DB_PASSWORD=kedarapte2004
DB_NAME=kedardemo
DB_HOST=127.0.0.1
DB_PORT=5432
EOL

# Check if .env file was created
if [[ -f "$ENV_FILE" ]]; then
    echo ".env file created successfully."
else
    echo "Failed to create .env file."
    exit 1
fi

# Step 2: Zip the project folder
echo "Creating zip of $PROJECT_DIR at $ZIP_OUTPUT"

# Check if 'zip' command is available, otherwise use PowerShell
if command -v zip >/dev/null 2>&1; then
    zip -r "$ZIP_OUTPUT" "$PROJECT_DIR"/*
else
    echo "zip command not found. Attempting to use PowerShell to create a zip file."
    powershell -Command "Compress-Archive -Path '$PROJECT_DIR/*' -DestinationPath '$ZIP_OUTPUT'"
fi

# Check if the zip file was created
if [[ -f "$ZIP_OUTPUT" ]]; then
    echo "Project zipped successfully: $ZIP_OUTPUT"
else
    echo "Failed to create zip file."
    exit 1
fi
