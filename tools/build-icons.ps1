$ndjson = Join-Path $PSScriptRoot "..\dont repo\Exiled-Exchange-2-master\renderer\public\data\en\items.ndjson"
$outPath = Join-Path $PSScriptRoot "..\icons.js"

function PriceKey([string]$name) {
  $s = ([string]$name).ToLowerInvariant().Normalize([Text.NormalizationForm]::FormD)
  $sb = New-Object System.Text.StringBuilder
  foreach ($c in $s.ToCharArray()) {
    if ([Globalization.CharUnicodeInfo]::GetUnicodeCategory($c) -ne [Globalization.UnicodeCategory]::NonSpacingMark) {
      [void]$sb.Append($c)
    }
  }
  $s = $sb.ToString() -replace "['\u2019]", ""
  $s = $s -replace "[^a-z0-9]+", " "
  return $s.Trim()
}

$icons = [ordered]@{}
$kept = 0

foreach ($line in [System.IO.File]::ReadAllLines($outPath)) {
  $m = [regex]::Match($line, '^\s*"(.+?)":\s*"(https://[^"]+)",?\s*$')
  if (-not $m.Success) { continue }
  $icons[$m.Groups[1].Value] = $m.Groups[2].Value
  $kept += 1
}

$added = 0
foreach ($line in [System.IO.File]::ReadAllLines($ndjson)) {
  if ($line.Trim() -eq "") { continue }
  $row = $line | ConvertFrom-Json
  $icon = [string]$row.icon
  if (-not $icon.StartsWith("https://")) { continue }
  if ($icon.Contains("NOT_FOUND")) { continue }
  foreach ($label in @($row.name, $row.refName)) {
    $key = PriceKey $label
    if ($key -eq "" -or $icons.Contains($key)) { continue }
    $icons[$key] = $icon
    $added += 1
  }
}

$out = New-Object System.Text.StringBuilder
[void]$out.Append("const ITEM_ICONS = {`n")
foreach ($key in ($icons.Keys | Sort-Object)) {
  $url = $icons[$key] -replace '\\', '\\\\' -replace '"', '\"'
  [void]$out.Append('  "' + $key + '": "' + $url + "`",`n")
}
[void]$out.Append("};`n")
[System.IO.File]::WriteAllText($outPath, $out.ToString().Replace("`n", "`r`n"))
Write-Output ("kept " + $kept + " added " + $added + " total " + $icons.Count)
