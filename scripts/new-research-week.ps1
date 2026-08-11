param(
  [string]$Week,
  [string]$Root = $(
    if ($env:FULL_TIME_CORPUS_ROOT) {
      $env:FULL_TIME_CORPUS_ROOT
    } else {
      Join-Path $env:USERPROFILE "dev\full-time\_corpus\weekly-intake"
    }
  )
)

$ErrorActionPreference = "Stop"

if (-not $Week) {
  $now = [DateTime]::UtcNow
  $isoYear = [System.Globalization.ISOWeek]::GetYear($now)
  $isoWeek = [System.Globalization.ISOWeek]::GetWeekOfYear($now)
  $Week = "{0}-W{1:D2}" -f $isoYear, $isoWeek
}

if ($Week -notmatch '^\d{4}-W\d{2}$') {
  throw "Week must use ISO format YYYY-Www, for example 2026-W33."
}

$weekRoot = Join-Path $Root $Week
$directories = @("inbox", "reviewed", "quarantine", "receipts")
$weekAlreadyExisted = Test-Path -LiteralPath $weekRoot

New-Item -ItemType Directory -Path $weekRoot -Force | Out-Null
foreach ($directory in $directories) {
  New-Item -ItemType Directory -Path (Join-Path $weekRoot $directory) -Force | Out-Null
}

$manifestPath = Join-Path $weekRoot "manifest.json"
if (-not (Test-Path -LiteralPath $manifestPath)) {
  $templatePath = Join-Path $PSScriptRoot "..\docs\templates\research-week-manifest.template.json"
  $manifest = (Get-Content -Raw -LiteralPath $templatePath).Replace("__WEEK__", $Week)
  Set-Content -LiteralPath $manifestPath -Value $manifest -Encoding utf8
}

$readmePath = Join-Path $weekRoot "README.md"
if (-not (Test-Path -LiteralPath $readmePath)) {
  $readmeTemplatePath = Join-Path $PSScriptRoot "..\docs\templates\research-week-readme.template.md"
  $readme = (Get-Content -Raw -LiteralPath $readmeTemplatePath).Replace("__WEEK__", $Week)
  Set-Content -LiteralPath $readmePath -Value $readme -Encoding utf8
}

[pscustomobject]@{
  week = $Week
  root = $weekRoot
  manifest = $manifestPath
  inbox = Join-Path $weekRoot "inbox"
  readme = $readmePath
  existed = $weekAlreadyExisted
} | ConvertTo-Json
