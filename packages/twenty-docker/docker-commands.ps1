<#
.SYNOPSIS
    PowerShell script for building Twenty CRM docker images on Windows.

.DESCRIPTION
    This script provides commands equivalent to the Makefile for Windows environments.
    Includes: Production, Development, MKT Product, LocalStack, Database commands.

.PARAMETER Command
    The command to execute. Run 'help' to see all available commands.

.PARAMETER Platform
    Target platform for docker build. Default: linux/amd64

.PARAMETER Tag
    Image tag. Default: latest

.PARAMETER BaseImage
    Base image for MKT build. Default: twentycrm/twenty:v1.2.0

.PARAMETER Force
    Skip confirmation prompts.

.EXAMPLE
    .\docker-commands.ps1 help
    .\docker-commands.ps1 dev-up
    .\docker-commands.ps1 dev-down -Force
    .\docker-commands.ps1 mkt -Tag v1.4.5
    .\docker-commands.ps1 localstack-start
#>

param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Command,

    [string]$Platform = "linux/amd64",
    [string]$Tag = "latest",
    [string]$BaseImage = "twentycrm/twenty:v1.2.0",
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Resolve-Path (Join-Path $ScriptDir "../..")

# =============================================================================
# Configuration
# =============================================================================

$LOCALSTACK_COMPOSE_FILE = "docker-compose.localstack.yml"
$LOCALSTACK_ENDPOINT = "http://localhost:4566"

# =============================================================================
# Helper Functions
# =============================================================================

function Confirm-Action {
    param([string]$Message)
    if (-not $Force) {
        $answer = Read-Host "$Message [y/N]"
        if ($answer -notin @("y", "Y")) {
            Write-Host "Cancelled."
            exit 0
        }
    }
}

# =============================================================================
# Build Commands
# =============================================================================

function Invoke-ProdBuild {
    Write-Host "Building Twenty CRM image..." -ForegroundColor Cyan
    Push-Location $RootDir
    try {
        docker build -f "./packages/twenty-docker/twenty/Dockerfile" --platform $Platform --tag "twenty:$Tag" .
    } finally { Pop-Location }
}

function Invoke-Mkt {
    Write-Host "Building MKT image..." -ForegroundColor Cyan
    Push-Location $RootDir
    try {
        docker build `
            -f "./packages/twenty-docker/twenty/server/Dockerfile" `
            --platform $Platform `
            --build-arg "BASE_IMAGE=$BaseImage" `
            --tag "mkt:$Tag" .
    } finally { Pop-Location }
}

function Invoke-ProdRun {
    docker run -d -p 3000:3000 --name twenty "twenty:$Tag"
}

function Invoke-ProdPostgresRun {
    docker run -d -p 5432:5432 -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres --name twenty-postgres "twenty-postgres:$Tag"
}

function Invoke-ProdWebsiteBuild {
    Push-Location $RootDir
    try {
        docker build -f "./packages/twenty-docker/twenty-website/Dockerfile" --platform $Platform --tag "twenty-website:$Tag" .
    } finally { Pop-Location }
}

function Invoke-ProdWebsiteRun {
    docker run -d -p 3000:3000 --name twenty-website "twenty-website:$Tag"
}

function Invoke-ProdServerBuild {
    Push-Location $RootDir
    try {
        docker build -f "./packages/twenty-docker/twenty/Dockerfile.server" --platform $Platform --tag "twenty-server:$Tag" .
    } finally { Pop-Location }
}

function Invoke-ProdServerRun {
    docker run -d -p 3003:3003 --name twenty-server "twenty-server:$Tag"
}

# =============================================================================
# Production Server (docker-compose.server.yml)
# =============================================================================

function Invoke-ProdServerUp {
    Push-Location $ScriptDir
    try { docker compose -f docker-compose.server.yml up -d } finally { Pop-Location }
}

function Invoke-ProdServerDown {
    Confirm-Action "Stop production server?"
    Push-Location $ScriptDir
    try { docker compose -f docker-compose.server.yml down } finally { Pop-Location }
}

function Invoke-ProdServerLogs {
    Push-Location $ScriptDir
    try { docker compose -f docker-compose.server.yml logs -f } finally { Pop-Location }
}

function Invoke-ProdServerRestart {
    Push-Location $ScriptDir
    try { docker compose -f docker-compose.server.yml restart } finally { Pop-Location }
}

# =============================================================================
# App-only Commands
# =============================================================================

function Invoke-AppDown {
    Push-Location $ScriptDir
    try { docker compose -f docker-compose.server.yml stop server } finally { Pop-Location }
}

function Invoke-AppUp {
    Push-Location $ScriptDir
    try { docker compose -f docker-compose.server.yml start server } finally { Pop-Location }
}

function Invoke-AppRestart {
    Push-Location $ScriptDir
    try { docker compose -f docker-compose.server.yml restart server } finally { Pop-Location }
}

function Invoke-AppLogs {
    Push-Location $ScriptDir
    try { docker compose -f docker-compose.server.yml logs -f server } finally { Pop-Location }
}

# =============================================================================
# Watch Build
# =============================================================================

function Invoke-WatchBuild {
    Push-Location $RootDir
    try { npx nx build twenty-server --watch } finally { Pop-Location }
}

# =============================================================================
# Development Environment (docker-compose.dev.yml)
# =============================================================================

function Invoke-DevBuild {
    Push-Location $ScriptDir
    try { docker compose -f docker-compose.dev.yml build } finally { Pop-Location }
}

function Invoke-DevUp {
    Push-Location $ScriptDir
    try { docker compose -f docker-compose.dev.yml up -d } finally { Pop-Location }
}

function Invoke-DevDown {
    Confirm-Action "Stop development environment and reset all database?"
    Push-Location $ScriptDir
    try { docker compose -f docker-compose.dev.yml down } finally { Pop-Location }
}

function Invoke-DevLogs {
    Push-Location $ScriptDir
    try { docker compose -f docker-compose.dev.yml logs -f } finally { Pop-Location }
}

function Invoke-DevLogsServer {
    Push-Location $ScriptDir
    try { docker compose -f docker-compose.dev.yml logs -f server } finally { Pop-Location }
}

function Invoke-DevRestart {
    Push-Location $ScriptDir
    try { docker compose -f docker-compose.dev.yml restart } finally { Pop-Location }
}

function Invoke-DevRestartServer {
    Push-Location $ScriptDir
    try { docker compose -f docker-compose.dev.yml restart server } finally { Pop-Location }
}

function Invoke-DevServerDown {
    Push-Location $ScriptDir
    try { docker compose -f docker-compose.dev.yml stop server worker } finally { Pop-Location }
}

function Invoke-DevServerUp {
    Push-Location $ScriptDir
    try { docker compose -f docker-compose.dev.yml start server worker } finally { Pop-Location }
}

function Invoke-DevLogsWorker {
    Push-Location $ScriptDir
    try { docker compose -f docker-compose.dev.yml logs -f worker } finally { Pop-Location }
}

function Invoke-DevRestartWorker {
    Push-Location $ScriptDir
    try { docker compose -f docker-compose.dev.yml restart worker } finally { Pop-Location }
}

function Invoke-DevClean {
    Confirm-Action "Remove DEV containers and volumes? This will DELETE all data!"
    Push-Location $ScriptDir
    try { docker compose -f docker-compose.dev.yml down -v } finally { Pop-Location }
}

function Invoke-DevStatus {
    Push-Location $ScriptDir
    try { docker compose -f docker-compose.dev.yml ps -a } finally { Pop-Location }
}

# =============================================================================
# MKT Product - Authorization Server (docker-compose.mkt-product.yml)
# =============================================================================

function Invoke-MktBuild {
    Push-Location $ScriptDir
    try { docker compose -f docker-compose.mkt-product.yml build } finally { Pop-Location }
}

function Invoke-MktUp {
    Push-Location $ScriptDir
    try { docker compose -f docker-compose.mkt-product.yml up -d } finally { Pop-Location }
}

function Invoke-MktDown {
    Confirm-Action "Stop MKT Product server?"
    Push-Location $ScriptDir
    try { docker compose -f docker-compose.mkt-product.yml down } finally { Pop-Location }
}

function Invoke-MktLogs {
    Push-Location $ScriptDir
    try { docker compose -f docker-compose.mkt-product.yml logs -f } finally { Pop-Location }
}

function Invoke-MktLogsServer {
    Push-Location $ScriptDir
    try { docker compose -f docker-compose.mkt-product.yml logs -f mkt-server } finally { Pop-Location }
}

function Invoke-MktLogsWorker {
    Push-Location $ScriptDir
    try { docker compose -f docker-compose.mkt-product.yml logs -f mkt-worker } finally { Pop-Location }
}

function Invoke-MktRestart {
    Push-Location $ScriptDir
    try { docker compose -f docker-compose.mkt-product.yml restart } finally { Pop-Location }
}

function Invoke-MktClean {
    Confirm-Action "Remove MKT containers and volumes? This will DELETE all data!"
    Push-Location $ScriptDir
    try { docker compose -f docker-compose.mkt-product.yml down -v } finally { Pop-Location }
}

function Invoke-MktStatus {
    Push-Location $ScriptDir
    try { docker compose -f docker-compose.mkt-product.yml ps -a } finally { Pop-Location }
}

# =============================================================================
# Database Commands
# =============================================================================

function Invoke-DbReset {
    Confirm-Action "Reset database? This will DELETE all data!"
    Push-Location $RootDir
    try { npx nx database:reset twenty-server } finally { Pop-Location }
}

function Invoke-DbMigrate {
    Push-Location $RootDir
    try { npx nx run twenty-server:database:migrate:prod } finally { Pop-Location }
}

function Invoke-DbSeed {
    Push-Location $RootDir
    try { npx nx command twenty-server -- workspace:seed:dev } finally { Pop-Location }
}

# =============================================================================
# LocalStack - AWS S3 Emulator for Local Development
# =============================================================================

function Invoke-LocalstackStart {
    Write-Host "Starting LocalStack..." -ForegroundColor Green
    Push-Location $ScriptDir
    try {
        docker compose -f $LOCALSTACK_COMPOSE_FILE up -d
        Write-Host "Waiting for LocalStack to be ready..." -ForegroundColor Green
        Start-Sleep -Seconds 5
        Invoke-LocalstackStatus
    } finally { Pop-Location }
}

function Invoke-LocalstackStop {
    Write-Host "Stopping LocalStack..." -ForegroundColor Yellow
    Push-Location $ScriptDir
    try { docker compose -f $LOCALSTACK_COMPOSE_FILE stop } finally { Pop-Location }
}

function Invoke-LocalstackDown {
    Write-Host "Stopping and removing LocalStack..." -ForegroundColor Red
    Push-Location $ScriptDir
    try { docker compose -f $LOCALSTACK_COMPOSE_FILE down } finally { Pop-Location }
}

function Invoke-LocalstackRestart {
    Invoke-LocalstackStop
    Invoke-LocalstackStart
}

function Invoke-LocalstackLogs {
    Push-Location $ScriptDir
    try { docker compose -f $LOCALSTACK_COMPOSE_FILE logs -f localstack } finally { Pop-Location }
}

function Invoke-LocalstackStatus {
    Write-Host "LocalStack Status:" -ForegroundColor Green
    try {
        $response = Invoke-RestMethod -Uri "$LOCALSTACK_ENDPOINT/_localstack/health" -TimeoutSec 5 -ErrorAction Stop
        $response | ConvertTo-Json -Depth 5
    }
    catch {
        Write-Host "LocalStack not responding" -ForegroundColor Red
    }
}

function Invoke-LocalstackReset {
    Confirm-Action "Reset LocalStack? This will DELETE all data!"
    Write-Host "Resetting LocalStack..." -ForegroundColor Red
    Push-Location $ScriptDir
    try { docker compose -f $LOCALSTACK_COMPOSE_FILE down -v } finally { Pop-Location }
    Invoke-LocalstackStart
}

# =============================================================================
# Help
# =============================================================================

function Show-Help {
    Write-Host ""
    Write-Host "Twenty CRM Docker Commands (PowerShell)" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage: .\docker-commands.ps1 <command> [-Tag <tag>] [-Platform <platform>] [-Force]" -ForegroundColor Yellow
    Write-Host ""

    Write-Host "=== Development (CRM) ===" -ForegroundColor Green
    Write-Host "  dev-build             Build dev image"
    Write-Host "  dev-up                Start (server, worker, db, redis)"
    Write-Host "  dev-down              Stop all"
    Write-Host "  dev-logs              View all logs"
    Write-Host "  dev-logs-server       View server logs"
    Write-Host "  dev-logs-worker       View worker logs"
    Write-Host "  dev-restart           Restart all"
    Write-Host "  dev-restart-server    Restart server"
    Write-Host "  dev-restart-worker    Restart worker"
    Write-Host "  dev-server-down       Stop server and worker"
    Write-Host "  dev-server-up         Start server and worker"
    Write-Host "  dev-clean             Remove containers and volumes"
    Write-Host "  dev-status            Show status"
    Write-Host ""

    Write-Host "=== MKT Product (OAuth2 Server) ===" -ForegroundColor Green
    Write-Host "  mkt-build             Build MKT image"
    Write-Host "  mkt-up                Start (server, worker, db, redis)"
    Write-Host "  mkt-down              Stop all"
    Write-Host "  mkt-logs              View all logs"
    Write-Host "  mkt-logs-server       View server logs"
    Write-Host "  mkt-logs-worker       View worker logs"
    Write-Host "  mkt-restart           Restart all"
    Write-Host "  mkt-clean             Remove containers and volumes"
    Write-Host "  mkt-status            Show status"
    Write-Host ""

    Write-Host "=== LocalStack (AWS S3 Emulator) ===" -ForegroundColor Green
    Write-Host "  localstack-start      Start LocalStack"
    Write-Host "  localstack-stop       Stop LocalStack"
    Write-Host "  localstack-down       Stop and remove containers"
    Write-Host "  localstack-restart    Restart LocalStack"
    Write-Host "  localstack-logs       View logs"
    Write-Host "  localstack-status     Check status"
    Write-Host "  localstack-reset      Complete reset"
    Write-Host ""

    Write-Host "=== Production ===" -ForegroundColor Green
    Write-Host "  prod-build            Build production image"
    Write-Host "  prod-run              Run production container"
    Write-Host "  prod-server-build     Build server image"
    Write-Host "  prod-server-run       Run server container"
    Write-Host "  prod-server-up        Start production (compose)"
    Write-Host "  prod-server-down      Stop production (compose)"
    Write-Host "  prod-server-logs      View production logs"
    Write-Host "  prod-server-restart   Restart production"
    Write-Host ""

    Write-Host "=== App-only ===" -ForegroundColor Green
    Write-Host "  app-up                Start app (keep db/redis)"
    Write-Host "  app-down              Stop app (keep db/redis)"
    Write-Host "  app-restart           Restart app"
    Write-Host "  app-logs              View app logs"
    Write-Host ""

    Write-Host "=== Database ===" -ForegroundColor Green
    Write-Host "  db-reset              Reset database"
    Write-Host "  db-migrate            Run migrations"
    Write-Host "  db-seed               Seed data"
    Write-Host ""

    Write-Host "=== Other ===" -ForegroundColor Green
    Write-Host "  mkt                   Build MKT docker image"
    Write-Host "  watch-build           Watch build for hot reload"
    Write-Host ""

    Write-Host "Options: -Tag latest  -Platform linux/amd64  -BaseImage twentycrm/twenty:v1.2.0  -Force" -ForegroundColor Yellow
    Write-Host "  Example: .\docker-commands.ps1 dev-down -Force" -ForegroundColor Yellow
    Write-Host ""
}

# =============================================================================
# Command Router
# =============================================================================

switch ($Command) {
    # Build
    "prod-build"           { Invoke-ProdBuild }
    "mkt"                  { Invoke-Mkt }
    "prod-run"             { Invoke-ProdRun }
    "prod-postgres-run"    { Invoke-ProdPostgresRun }
    "prod-website-build"   { Invoke-ProdWebsiteBuild }
    "prod-website-run"     { Invoke-ProdWebsiteRun }
    "prod-server-build"    { Invoke-ProdServerBuild }
    "prod-server-run"      { Invoke-ProdServerRun }

    # Production Server
    "prod-server-up"       { Invoke-ProdServerUp }
    "prod-server-down"     { Invoke-ProdServerDown }
    "prod-server-logs"     { Invoke-ProdServerLogs }
    "prod-server-restart"  { Invoke-ProdServerRestart }

    # App-only
    "app-down"             { Invoke-AppDown }
    "app-up"               { Invoke-AppUp }
    "app-restart"          { Invoke-AppRestart }
    "app-logs"             { Invoke-AppLogs }

    # Watch
    "watch-build"          { Invoke-WatchBuild }

    # Development
    "dev-build"            { Invoke-DevBuild }
    "dev-up"               { Invoke-DevUp }
    "dev-down"             { Invoke-DevDown }
    "dev-logs"             { Invoke-DevLogs }
    "dev-logs-server"      { Invoke-DevLogsServer }
    "dev-restart"          { Invoke-DevRestart }
    "dev-restart-server"   { Invoke-DevRestartServer }
    "dev-server-down"      { Invoke-DevServerDown }
    "dev-server-up"        { Invoke-DevServerUp }
    "dev-logs-worker"      { Invoke-DevLogsWorker }
    "dev-restart-worker"   { Invoke-DevRestartWorker }
    "dev-clean"            { Invoke-DevClean }
    "dev-status"           { Invoke-DevStatus }

    # MKT Product
    "mkt-build"            { Invoke-MktBuild }
    "mkt-up"               { Invoke-MktUp }
    "mkt-down"             { Invoke-MktDown }
    "mkt-logs"             { Invoke-MktLogs }
    "mkt-logs-server"      { Invoke-MktLogsServer }
    "mkt-logs-worker"      { Invoke-MktLogsWorker }
    "mkt-restart"          { Invoke-MktRestart }
    "mkt-clean"            { Invoke-MktClean }
    "mkt-status"           { Invoke-MktStatus }

    # Database
    "db-reset"             { Invoke-DbReset }
    "db-migrate"           { Invoke-DbMigrate }
    "db-seed"              { Invoke-DbSeed }

    # LocalStack
    "localstack-start"     { Invoke-LocalstackStart }
    "localstack-stop"      { Invoke-LocalstackStop }
    "localstack-down"      { Invoke-LocalstackDown }
    "localstack-restart"   { Invoke-LocalstackRestart }
    "localstack-logs"      { Invoke-LocalstackLogs }
    "localstack-status"    { Invoke-LocalstackStatus }
    "localstack-reset"     { Invoke-LocalstackReset }

    # Help
    "help"                 { Show-Help }

    default {
        Write-Host "Unknown command: $Command" -ForegroundColor Red
        Write-Host "Run '.\docker-commands.ps1 help' to see available commands."
        exit 1
    }
}
