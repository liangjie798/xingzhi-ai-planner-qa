param([int]$Offset=0,[int]$Count=2,[string]$TargetsFile='query-targets.json',[string]$TaskRoot=(Split-Path -Parent (Split-Path -Parent $PSScriptRoot)),[string]$CliPath=$env:PLAYWRIGHT_CLI_PATH)
$ErrorActionPreference='Stop'
$taskRoot=$TaskRoot
if(-not $CliPath){throw 'Set PLAYWRIGHT_CLI_PATH or pass -CliPath pointing to playwright-cli.js'}
$qaRoot=Split-Path -Parent $PSScriptRoot
$targets=Get-Content -LiteralPath "$taskRoot\output\playwright\all-airlines-20261030\$TargetsFile" -Raw|ConvertFrom-Json
$slice=@($targets|Select-Object -Skip $Offset -First $Count)
$code=[Convert]::ToBase64String([IO.File]::ReadAllBytes("$qaRoot\scripts\probe-airline-query.js"))
$data=[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes((ConvertTo-Json -InputObject $slice -Depth 8 -Compress)))
$cli=$CliPath
$reply=& node $cli -s=airlinequeries run-code "async page=>await(eval('('+Buffer.from('$code','base64').toString()+')'))(page,JSON.parse(Buffer.from('$data','base64').toString()))"
$raw=($reply -join "`n").Split('### Ran Playwright code')[0]
if($raw -notmatch '(?s)### Result\s*\r?\n(.*)'){Write-Output $raw;throw 'No browser results'}
$rows=$Matches[1].Trim()|ConvertFrom-Json
foreach($row in $rows){$file="$taskRoot\output\playwright\all-airlines-20261030\$($row.id)-query.json";$initial="$taskRoot\output\playwright\all-airlines-20261030\$($row.id)-query-initial.json";if((Test-Path -LiteralPath $file)-and !(Test-Path -LiteralPath $initial)){Copy-Item -LiteralPath $file -Destination $initial};$row|ConvertTo-Json -Depth 15|Set-Content -Encoding utf8 $file;[pscustomobject]@{id=$row.id;name=$row.name;outcome=$row.outcome;submitted=$row.submitted;url=$row.finalUrl;ms=$row.ms;error=$row.error}|ConvertTo-Json -Compress}
