<#
.SYNOPSIS
    PowerShell script for building Twenty CRM docker images on Windows.

.DESCRIPTION
    This script provides commands equivalent to the Makefile for Windows environments.

.PARAMETER Command
    The command to execute. Available commands:
    - prod-build: Build full Twenty CRM image
    - prod-run: Run Twenty CRM container
    - prod-postgres-run: Run PostgreSQL container
    - prod-website-build: Build website image
    - prod-website-run: Run website container
    - prod-server-build: Build server-only image (without frontend)
    - prod-server-run: Run server container
    - prod-server-up: Start server with docker compose
    - prod-server-down: Stop server with docker compose
    - prod-server-logs: View server logs
    - prod-server-restart: Restart server
    - app-down: Stop app only (keep db and redis running)
    - app-up: Start app only
    - app-restart: Restart app only
    - app-logs: View app logs
    - watch-build: Watch and rebuild server on code changes
    - db-reset: Reset database
    - db-migrate: Run database migrations
    - db-seed: Seed development data

.PARAMETER Platform
    Target platform for docker build. Default: linux/amd64

.PARAMETER Tag
    Image tag. Default: latest

.EXAMPLE
    .\docker-commands.ps1 prod-server-build
    .\docker-commands.ps1 prod-server-up
    .\docker-commands.ps1 prod-server-build -Tag v1.0.0
    .\docker-commands.ps1 prod-server-build -Platform linux/arm64
#>

param(
    [Parameter(Mandatory=$true, Position=0)]
    [ValidateSet(
        "prod-build",
        "prod-run",
        "prod-postgres-run",
        "prod-website-build",
        "prod-website-run",
        "prod-server-build",
        "prod-server-run",
        "prod-server-up",
        "prod-server-down",
        "prod-server-logs",
        "prod-server-restart",
        "app-down",
        "app-up",
        "app-restart",
        "app-logs",
        "watch-build",
        "db-reset",
        "db-migrate",
        "db-seed",
        "prod-server-db-init",
        "prod-server-db-migrate",
        "help"
    )]
    [string]$Command,

    [Parameter(Mandatory=$false)]
    [string]$Platform = "linux/amd64",

    [Parameter(Mandatory=$false)]
    [string]$Tag = "latest"
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Resolve-Path (Join-Path $ScriptDir "../..")

function Show-Help {
    Write-Host @"

Twenty CRM Docker Commands (PowerShell)
========================================

Usage: .\docker-commands.ps1 <command> [-Platform <platform>] [-Tag <tag>]

Commands:
  prod-build            Build full Twenty CRM image (frontend + backend)
  prod-run              Run Twenty CRM container
  prod-postgres-run     Run PostgreSQL container
  prod-website-build    Build website image
  prod-website-run      Run website container
  prod-server-build     Build server-only image (without frontend)
  prod-server-run       Run server container standalone
  prod-server-up        Start server with docker compose
  prod-server-down      Stop server with docker compose
  prod-server-logs      View server logs (follow mode)
  prod-server-restart   Restart server containers
  app-down              Stop app only (keep db and redis running)
  app-up                Start app only
  app-restart           Restart app only
  app-logs              View app logs (follow mode)
  watch-build           Watch and rebuild server on code changes
  prod-server-db-init   Initialize database in container
  prod-server-db-migrate Run migrations in container
  db-reset              Reset local database
  db-migrate            Run local database migrations
  db-seed               Seed local development data
  help                  Show this help message

Options:
  -Platform             Target platform (default: linux/amd64)
  -Tag                  Image tag (default: latest)

Examples:
  .\docker-commands.ps1 prod-server-build
  .\docker-commands.ps1 prod-server-up
  .\docker-commands.ps1 prod-server-build -Tag v1.0.0
  .\docker-commands.ps1 prod-server-build -Platform linux/arm64

"@
}

function Invoke-ProdBuild {
    Write-Host "Building Twenty CRM image..." -ForegroundColor Cyan
    Push-Location $RootDir
    try {
        docker build -f "./packages/twenty-docker/twenty/Dockerfile" --platform $Platform --tag "twenty:$Tag" .
    } finally {
        Pop-Location
    }
}

function Invoke-ProdRun {
    Write-Host "Running Twenty CRM container..." -ForegroundColor Cyan
    docker run -d -p 3000:3000 --name twenty "twenty:$Tag"
}

function Invoke-ProdPostgresRun {
    Write-Host "Running PostgreSQL container..." -ForegroundColor Cyan
    docker run -d -p 5432:5432 -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres --name twenty-postgres "twenty-postgres:$Tag"
}

function Invoke-ProdWebsiteBuild {
    Write-Host "Building website image..." -ForegroundColor Cyan
    Push-Location $RootDir
    try {
        docker build -f "./packages/twenty-docker/twenty-website/Dockerfile" --platform $Platform --tag "twenty-website:$Tag" .
    } finally {
        Pop-Location
    }
}

function Invoke-ProdWebsiteRun {
    Write-Host "Running website container..." -ForegroundColor Cyan
    docker run -d -p 3000:3000 --name twenty-website "twenty-website:$Tag"
}

function Invoke-ProdServerBuild {
    Write-Host "Building server-only image..." -ForegroundColor Cyan
    Push-Location $RootDir
    try {
        docker build -f "./packages/twenty-docker/twenty/Dockerfile.server" --platform $Platform --tag "twenty-server:$Tag" .
    } finally {
        Pop-Location
    }
}

function Invoke-ProdServerRun {
    Write-Host "Running server container..." -ForegroundColor Cyan
    docker run -d -p 3003:3003 --name twenty-server "twenty-server:$Tag"
}

function Invoke-ProdServerUp {
    Write-Host "Starting server with docker compose..." -ForegroundColor Cyan
    Push-Location $ScriptDir
    try {
        docker compose -f docker-compose.server.yml up -d
    } finally {
        Pop-Location
    }
}

function Invoke-ProdServerDown {
    Write-Host "Stopping server..." -ForegroundColor Cyan
    Push-Location $ScriptDir
    try {
        docker compose -f docker-compose.server.yml down
    } finally {
        Pop-Location
    }
}

function Invoke-ProdServerLogs {
    Write-Host "Viewing server logs (Ctrl+C to exit)..." -ForegroundColor Cyan
    Push-Location $ScriptDir
    try {
        docker compose -f docker-compose.server.yml logs -f
    } finally {
        Pop-Location
    }
}

function Invoke-ProdServerRestart {
    Write-Host "Restarting server..." -ForegroundColor Cyan
    Push-Location $ScriptDir
    try {
        docker compose -f docker-compose.server.yml restart
    } finally {
        Pop-Location
    }
}

function Invoke-AppDown {
    Write-Host "Stopping app (keeping db and redis)..." -ForegroundColor Cyan
    Push-Location $ScriptDir
    try {
        docker compose -f docker-compose.server.yml stop server
    } finally {
        Pop-Location
    }
}

function Invoke-AppUp {
    Write-Host "Starting app..." -ForegroundColor Cyan
    Push-Location $ScriptDir
    try {
        docker compose -f docker-compose.server.yml start server
    } finally {
        Pop-Location
    }
}

function Invoke-AppRestart {
    Write-Host "Restarting app..." -ForegroundColor Cyan
    Push-Location $ScriptDir
    try {
        docker compose -f docker-compose.server.yml restart server
    } finally {
        Pop-Location
    }
}

function Invoke-AppLogs {
    Write-Host "Viewing app logs (Ctrl+C to exit)..." -ForegroundColor Cyan
    Push-Location $ScriptDir
    try {
        docker compose -f docker-compose.server.yml logs -f server
    } finally {
        Pop-Location
    }
}

function Invoke-WatchBuild {
    Write-Host "Starting watch build for twenty-server (Ctrl+C to stop)..." -ForegroundColor Cyan
    Push-Location $RootDir
    try {
        npx nx build twenty-server --watch
    } finally {
        Pop-Location
    }
}

function Invoke-ProdServerDbInit {
    Write-Host "Initializing database in container..." -ForegroundColor Cyan
    Push-Location $ScriptDir
    try {
        docker compose -f docker-compose.server.yml exec server yarn database:init:prod
    } finally {
        Pop-Location
    }
}

function Invoke-ProdServerDbMigrate {
    Write-Host "Running migrations in container..." -ForegroundColor Cyan
    Push-Location $ScriptDir
    try {
        docker compose -f docker-compose.server.yml exec server yarn database:migrate:prod
    } finally {
        Pop-Location
    }
}

function Invoke-DbReset {
    Write-Host "Resetting database in container..." -ForegroundColor Cyan
    Write-Host "This will drop and recreate the database schema, then run migrations." -ForegroundColor Yellow
    Push-Location $ScriptDir
    try {
        # Drop and recreate schema, then run migrations
        docker compose -f docker-compose.server.yml exec server yarn database:init:prod
    } finally {
        Pop-Location
    }
}

function Invoke-DbMigrate {
    Write-Host "Running database migrations in container..." -ForegroundColor Cyan
    Push-Location $ScriptDir
    try {
        docker compose -f docker-compose.server.yml exec server yarn database:migrate:prod
    } finally {
        Pop-Location
    }
}

function Invoke-DbSeed {
    Write-Host "Seeding development data in container..." -ForegroundColor Cyan
    Push-Location $ScriptDir
    try {
        docker compose -f docker-compose.server.yml exec server yarn command:prod workspace:seed:dev
    } finally {
        Pop-Location
    }
}

# Main execution
switch ($Command) {
    "prod-build" { Invoke-ProdBuild }
    "prod-run" { Invoke-ProdRun }
    "prod-postgres-run" { Invoke-ProdPostgresRun }
    "prod-website-build" { Invoke-ProdWebsiteBuild }
    "prod-website-run" { Invoke-ProdWebsiteRun }
    "prod-server-build" { Invoke-ProdServerBuild }
    "prod-server-run" { Invoke-ProdServerRun }
    "prod-server-up" { Invoke-ProdServerUp }
    "prod-server-down" { Invoke-ProdServerDown }
    "prod-server-logs" { Invoke-ProdServerLogs }
    "prod-server-restart" { Invoke-ProdServerRestart }
    "app-down" { Invoke-AppDown }
    "app-up" { Invoke-AppUp }
    "app-restart" { Invoke-AppRestart }
    "app-logs" { Invoke-AppLogs }
    "watch-build" { Invoke-WatchBuild }
    "prod-server-db-init" { Invoke-ProdServerDbInit }
    "prod-server-db-migrate" { Invoke-ProdServerDbMigrate }
    "db-reset" { Invoke-DbReset }
    "db-migrate" { Invoke-DbMigrate }
    "db-seed" { Invoke-DbSeed }
    "help" { Show-Help }
    default { Show-Help }
}

Write-Host "`nDone!" -ForegroundColor Green
