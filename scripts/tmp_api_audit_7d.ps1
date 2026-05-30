$zeroPath='c:\Users\mehdi\AppData\Roaming\Code\User\workspaceStorage\cce75b2bc0fd71fc2e635b93189fd322\GitHub.copilot-chat\chat-session-resources\240895d1-d6a7-477d-913f-b8eba21124be\call_dYyYY32cFnk2qgAyhvjVW6Oa__vscode-1780119909500\content.json'
$vercelLogsPath='c:\Users\mehdi\AppData\Roaming\Code\User\workspaceStorage\cce75b2bc0fd71fc2e635b93189fd322\GitHub.copilot-chat\chat-session-resources\240895d1-d6a7-477d-913f-b8eba21124be\call_wBRjjhHWEEnh5F5lIpxQjmyD__vscode-1780119909520\content.txt'
$zero=Get-Content $zeroPath -Raw | ConvertFrom-Json | Sort-Object route
$events=@()
Get-Content $vercelLogsPath | ForEach-Object {
  $line=$_.Trim()
  if($line.StartsWith('{') -and $line.Contains('"requestPath"')){
    try { $obj=$line | ConvertFrom-Json; if($obj.requestPath){ $events += $obj } } catch {}
  }
}
function RouteToRegex([string]$route){
  $escaped=[regex]::Escape($route)
  $escaped=$escaped -replace '\\\[[^\]]+\\\]','[^/]+'
  '^' + $escaped + '$'
}
function DetectCallerAndDeps([string]$route,[string]$file){
  $matches = rg -n -F "$route" src docs scripts README.md 2>$null
  $caller='None observed'
  $possibleDeps = New-Object System.Collections.Generic.List[string]
  if($matches){
    $paths = $matches | ForEach-Object { ($_ -split ':')[0] } | Select-Object -Unique
    if($paths | Where-Object { $_ -match '^src/components/' -or $_ -match '^src/hooks/' -or $_ -match '^src/app/.+\.tsx$' }){ $caller='Client-side fetch'; [void]$possibleDeps.Add('Client-side fetches') }
    if($paths | Where-Object { $_ -match '^src/app/api/' }){ if($caller -eq 'None observed'){ $caller='Server-side/internal API chain' }; [void]$possibleDeps.Add('Automations') }
    if($paths | Where-Object { $_ -match '^docs/' -or $_ -match '^README\.md$' -or $_ -match '^scripts/' }){ if($caller -eq 'None observed'){ $caller='Docs/scripts/manual integration' }; [void]$possibleDeps.Add('External integrations') }
  }
  $scanText = ''
  if(Test-Path $file){ $scanText = Get-Content $file -Raw }
  if($route -like '/api/webhooks/*' -or $scanText -match 'webhook'){ [void]$possibleDeps.Add('Webhook providers'); [void]$possibleDeps.Add('External integrations'); if($caller -eq 'None observed'){ $caller='Webhook provider' } }
  if($scanText -match 'whop|WHOP_'){ [void]$possibleDeps.Add('Whop'); if($caller -eq 'None observed'){ $caller='Whop integration' } }
  if($scanText -match 'stripe|STRIPE_'){ [void]$possibleDeps.Add('Stripe'); if($caller -eq 'None observed'){ $caller='Stripe integration' } }
  if($scanText -match 'supabase|SUPABASE_'){ [void]$possibleDeps.Add('Supabase') }
  if($scanText -match 'cron|schedule|scheduled|queue|worker|trigger'){ [void]$possibleDeps.Add('Automations') }
  if($route -match '^/api/auth/' -or $route -match '^/api/social/' -or $route -match '^/api/whop-link$'){ [void]$possibleDeps.Add('External integrations') }
  if($route -match '^/api/pay|^/api/payment-links|^/api/offers|^/api/series|^/api/vault|^/api/commissions|^/api/bookings'){ [void]$possibleDeps.Add('Whop') }
  $depsUnique = $possibleDeps | Select-Object -Unique
  $deps = if($depsUnique.Count -eq 0){ 'None identified' } else { ($depsUnique -join ', ') }
  [pscustomobject]@{ PrimaryCaller=$caller; PossibleDependencies=$deps }
}
$rows=@()
foreach($e in $zero){
  $route=$e.route
  $file=$e.file
  $regex=RouteToRegex $route
  $hits = $events | Where-Object { $_.requestPath -match $regex }
  $reqCount = ($hits | Measure-Object).Count
  $lastTs = ($hits | Sort-Object timestamp -Descending | Select-Object -First 1).timestamp
  $lastAccess = if($lastTs){ [DateTimeOffset]::FromUnixTimeMilliseconds([int64]$lastTs).UtcDateTime.ToString('yyyy-MM-dd HH:mm:ss UTC') } else { 'No traffic observed (7d)' }
  $statusDist = if($reqCount -gt 0){ (($hits | Group-Object responseStatusCode | Sort-Object Name | ForEach-Object { "{0}:{1}" -f $_.Name,$_.Count }) -join ', ') } else { 'none' }
  $mentions = rg -n -F "$route" src docs scripts README.md 2>$null
  $mentionCount = if($mentions){ ($mentions | Measure-Object).Count } else { 0 }
  $det = DetectCallerAndDeps -route $route -file $file
  $deps = $det.PossibleDependencies
  $hasKnownIntegration = $deps -ne 'None identified'
  if($reqCount -gt 0){ $class='Active' } elseif((-not $hasKnownIntegration) -and $mentionCount -eq 0){ $class='Dormant' } else { $class='Unknown' }
  $rows += [pscustomobject]@{ Endpoint=$route; RequestCount=$reqCount; LastAccessTime=$lastAccess; ResponseStatusDistribution=$statusDist; PrimaryCaller=$det.PrimaryCaller; PossibleDependencies=$deps; LiteralReferences=$mentionCount; Classification=$class }
}
$active = $rows | Where-Object Classification -eq 'Active' | Sort-Object Endpoint
$dormant = $rows | Where-Object Classification -eq 'Dormant' | Sort-Object Endpoint
$unknown = $rows | Where-Object Classification -eq 'Unknown' | Sort-Object Endpoint
$auditLines = New-Object System.Collections.Generic.List[string]
[void]$auditLines.Add('# API Usage Audit (7-Day Runtime Window)')
[void]$auditLines.Add('')
[void]$auditLines.Add("Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz')")
[void]$auditLines.Add('')
[void]$auditLines.Add('Definitions used:')
[void]$auditLines.Add('- Active: Received traffic within 7 days.')
[void]$auditLines.Add('- Dormant: No traffic within 7 days and no known integrations.')
[void]$auditLines.Add('- Unknown: No traffic observed but external dependencies cannot yet be ruled out.')
[void]$auditLines.Add('')
[void]$auditLines.Add("Total endpoints audited: $($rows.Count)")
[void]$auditLines.Add("Active: $($active.Count) | Dormant: $($dormant.Count) | Unknown: $($unknown.Count)")
[void]$auditLines.Add('')
function AddSection([string]$title, $dataset, [bool]$includeDeps){
  [void]$auditLines.Add("## $title")
  [void]$auditLines.Add('')
  if($includeDeps){
    [void]$auditLines.Add('| Endpoint | Request Count | Last Access Time | Response Status Distribution | Primary Caller | Possible Dependencies |')
    [void]$auditLines.Add('|---|---:|---|---|---|---|')
  } else {
    [void]$auditLines.Add('| Endpoint | Request Count | Last Access Time | Response Status Distribution | Primary Caller |')
    [void]$auditLines.Add('|---|---:|---|---|---|')
  }
  foreach($r in $dataset){
    if($includeDeps){ [void]$auditLines.Add("| $($r.Endpoint) | $($r.RequestCount) | $($r.LastAccessTime) | $($r.ResponseStatusDistribution) | $($r.PrimaryCaller) | $($r.PossibleDependencies) |") }
    else { [void]$auditLines.Add("| $($r.Endpoint) | $($r.RequestCount) | $($r.LastAccessTime) | $($r.ResponseStatusDistribution) | $($r.PrimaryCaller) |") }
  }
  [void]$auditLines.Add('')
}
AddSection -title 'ACTIVE ENDPOINTS' -dataset $active -includeDeps $false
AddSection -title 'DORMANT ENDPOINTS' -dataset $dormant -includeDeps $false
AddSection -title 'UNKNOWN ENDPOINTS' -dataset $unknown -includeDeps $true
Set-Content -Path 'docs/API_USAGE_AUDIT_7D.md' -Value $auditLines -Encoding UTF8
$candidates = $rows | Where-Object { $_.Classification -eq 'Dormant' -and $_.RequestCount -eq 0 -and $_.LiteralReferences -eq 0 -and $_.PossibleDependencies -eq 'None identified' } | Sort-Object Endpoint
$delLines = New-Object System.Collections.Generic.List[string]
[void]$delLines.Add('# Runtime-Verified Deletion Candidates (7-Day Window)')
[void]$delLines.Add('')
[void]$delLines.Add('Inclusion criteria: Dormant + No references + No integrations + No traffic.')
[void]$delLines.Add('')
[void]$delLines.Add("Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz')")
[void]$delLines.Add('')
[void]$delLines.Add("Candidate count: $($candidates.Count)")
[void]$delLines.Add('')
[void]$delLines.Add('| Endpoint | Request Count | Last Access Time | Response Status Distribution | Primary Caller |')
[void]$delLines.Add('|---|---:|---|---|---|')
foreach($r in $candidates){ [void]$delLines.Add("| $($r.Endpoint) | $($r.RequestCount) | $($r.LastAccessTime) | $($r.ResponseStatusDistribution) | $($r.PrimaryCaller) |") }
Set-Content -Path 'docs/API_DELETION_CANDIDATES_RUNTIME.md' -Value $delLines -Encoding UTF8
Write-Output ('COUNTS total=' + $rows.Count + ' active=' + $active.Count + ' dormant=' + $dormant.Count + ' unknown=' + $unknown.Count + ' candidates=' + $candidates.Count)
