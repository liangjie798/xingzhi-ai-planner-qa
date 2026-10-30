param([int]$Offset=0,[int]$Count=3,[string]$TaskRoot=(Split-Path -Parent (Split-Path -Parent $PSScriptRoot)),[string]$CliPath=$env:PLAYWRIGHT_CLI_PATH)
$ErrorActionPreference='Stop'
$taskRoot=$TaskRoot
if(-not $CliPath){throw 'Set PLAYWRIGHT_CLI_PATH or pass -CliPath pointing to playwright-cli.js'}
$qaRoot=Split-Path -Parent $PSScriptRoot
$targets=Get-Content -LiteralPath "$taskRoot\output\playwright\all-airlines-20261030\targets.json" -Raw | ConvertFrom-Json
$slice=@($targets | Select-Object -Skip $Offset -First $Count)
$probeCode=[Convert]::ToBase64String([IO.File]::ReadAllBytes("$qaRoot\scripts\probe-all-airlines.js"))
$targetsCode=[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes((ConvertTo-Json -InputObject $slice -Depth 8 -Compress)))
$reply=& node $CliPath -s=allairlines run-code "async page=>await(eval('('+Buffer.from('$probeCode','base64').toString()+')'))(page,JSON.parse(Buffer.from('$targetsCode','base64').toString()))"
$raw=($reply -join "`n").Split('### Ran Playwright code')[0]
if($raw -notmatch '(?s)### Result\s*\r?\n(.*)'){Write-Output $raw;throw 'No browser results'}
$rows=$Matches[1].Trim()|ConvertFrom-Json
foreach($row in $rows){$row|ConvertTo-Json -Depth 15|Set-Content -Encoding utf8 "$taskRoot\output\playwright\all-airlines-20261030\$($row.id).json";[pscustomobject]@{id=$row.id;name=$row.name;outcome=$row.outcome;status=$row.status;title=$row.title;inputs=$row.inputs.Count;ms=$row.ms;error=$row.error}|ConvertTo-Json -Compress}
