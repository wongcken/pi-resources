#!/bin/bash
# Quick setup script for new Python projects with uv

set -e

PROJECT_NAME=${1:-"my-project"}

echo "🚀 Setting up Python project: $PROJECT_NAME"

# Initialize project
uv init "$PROJECT_NAME"
cd "$PROJECT_NAME"

# Add common development dependencies
echo "📦 Adding development dependencies..."
uv add --dev ruff pytest

# Create basic project structure
mkdir -p src tests

# Create a basic .gitignore if it doesn't exist
if [ ! -f .gitignore ]; then
  cat > .gitignore << 'EOF'
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg

# Virtual environments
.env
.venv
env/
venv/

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# Testing
.pytest_cache/
.coverage
htmlcov/

# UV
uv.lock
EOF
fi

echo "✅ Project setup complete!"
echo ""
echo "Next steps:"
echo "  cd $PROJECT_NAME"
echo "  uv run python --version"
echo "  uv add <your-dependencies>"
