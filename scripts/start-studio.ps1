param(
  [ValidateRange(1024,65535)][int]$Port = 8850,
  [string]$EnvFile = '',
  [string]$ProjectsRoot = '',
  [switch]$SkipBuild,
  [switch]$Watch
)
$ErrorActionPreference = 'Stop'
$taskRepo = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Set-Location -LiteralPath $taskRepo
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js >=22.13 is required.' }
if (-not (Test-Path -LiteralPath (Join-Path $taskRepo 'node_modules'))) { throw 'Run npm ci in this checkout first.' }
if (Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue) { throw "Port $Port is already in use. Open http://127.0.0.1:$Port/ or choose -Port; this launcher will not stop another server." }
if ($EnvFile) {
  $taskEnvPath = [System.IO.Path]::GetFullPath($EnvFile)
  if (-not (Test-Path -LiteralPath $taskEnvPath -PathType Leaf)) { throw 'EnvFile does not exist.' }
  $env:STORY_FACTORY_ENV_FILE = $taskEnvPath
}
if ($ProjectsRoot) { $env:STUDIO_PROJECTS_ROOT = [System.IO.Path]::GetFullPath($ProjectsRoot) }
if (-not $SkipBuild) { & npm.cmd run build; if ($LASTEXITCODE -ne 0) { throw 'Build failed.' } }
$env:STUDIO_PORT = [string]$Port
Write-Host "Studio: http://127.0.0.1:$Port/"
Write-Host "Character references: http://127.0.0.1:$Port/api/topics/prehistoric-life/compare"
Write-Host 'Keep this terminal open. Ctrl+C stops this server.'
if ($Watch) { & node --watch --import tsx apps/server/index.ts }
else { & node --import tsx apps/server/index.ts }
exit $LASTEXITCODE
