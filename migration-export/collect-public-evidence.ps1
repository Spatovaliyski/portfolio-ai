param([string]$Workspace = 'C:\Users\Martin\Desktop\Portfolio')
$ErrorActionPreference = 'Stop'
$archiveRoot = Join-Path $Workspace 'migration-export'
$rawRoot = Join-Path $archiveRoot 'raw'
$originalRoot = Join-Path $archiveRoot 'originals'
$publicRoot = Join-Path $Workspace 'public/media'
foreach ($directory in @($rawRoot, $originalRoot, $publicRoot, (Join-Path $rawRoot 'wordpress'), (Join-Path $rawRoot 'github'), (Join-Path $rawRoot 'bausy'), (Join-Path $rawRoot 'current-site'))) { New-Item -ItemType Directory -Path $directory -Force | Out-Null }
$retrieved = [DateTime]::UtcNow.ToString('o')
$errors = [Collections.Generic.List[object]]::new()
$requests = [Collections.Generic.List[object]]::new()
$assets = [Collections.Generic.List[object]]::new()
function Fetch-Text([string]$Url, [string]$RelativePath) {
  try {
    $response = Invoke-WebRequest -Uri $Url -TimeoutSec 30
    $target = Join-Path $rawRoot $RelativePath
    [IO.File]::WriteAllText($target, $response.Content, [Text.UTF8Encoding]::new($false))
    $requests.Add([pscustomobject]@{url=$Url;path=('raw/' + $RelativePath.Replace('\','/'));status=[int]$response.StatusCode;sha256=(Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLower();retrievedAt=$retrieved;wordpressTotal=$response.Headers['X-WP-Total'];wordpressTotalPages=$response.Headers['X-WP-TotalPages']})
    return $response
  } catch {
    $errors.Add([pscustomobject]@{url=$Url;kind='request';error=$_.Exception.Message})
    return $null
  }
}
function Fetch-Asset([string]$Url, [string]$RelativePath, [string]$Purpose, [string]$Rights, [string]$Alt) {
  $target = Join-Path $Workspace $RelativePath
  try {
    $response = Invoke-WebRequest -Uri $Url -OutFile $target -PassThru -TimeoutSec 40
    $contentType = [string]$response.Headers['Content-Type'][0]
    if ($RelativePath.StartsWith('public/media/') -and -not $contentType.StartsWith('image/')) { throw "Expected image; received $contentType" }
    $record = [pscustomobject]@{sourceUrl=$Url;path=$RelativePath.Replace('\','/');purpose=$Purpose;rights=$Rights;alt=$Alt;retrievedAt=$retrieved;sha256=(Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLower();bytes=(Get-Item -LiteralPath $target).Length}
    $assets.Add($record)
    return $record
  } catch {
    $errors.Add([pscustomobject]@{url=$Url;path=$RelativePath;kind='asset';error=$_.Exception.Message})
    return $null
  }
}
$index = Fetch-Text 'https://wp.spatovaliyski.com/wp-json/' 'wordpress/api-index.json'
$typesResponse = Fetch-Text 'https://wp.spatovaliyski.com/wp-json/wp/v2/types' 'wordpress/types.json'
$null = Fetch-Text 'https://wp.spatovaliyski.com/wp-json/wp/v2/taxonomies' 'wordpress/taxonomies.json'
$availabilityResponse = Fetch-Text 'https://wp.spatovaliyski.com/wp-json/theme-options/v1/opentowork' 'wordpress/availability.json'
$collections = [ordered]@{}
foreach ($endpoint in @('pages','posts','work_projects','work_experience','media','categories','tags')) {
  $items = [Collections.Generic.List[object]]::new()
  $page = 1
  $totalPages = 1
  do {
    $response = Fetch-Text "https://wp.spatovaliyski.com/wp-json/wp/v2/${endpoint}?per_page=100&page=$page" "wordpress/$endpoint-page-$page.json"
    if ($null -eq $response) { break }
    $decoded = ConvertFrom-Json -InputObject $response.Content -Depth 100
    foreach ($item in @($decoded)) { $items.Add($item) }
    if ($response.Headers['X-WP-TotalPages']) { $totalPages = [int]$response.Headers['X-WP-TotalPages'][0] }
    $page++
  } while ($page -le $totalPages -and $page -le 100)
  $collections[$endpoint] = @($items.ToArray())
  ConvertTo-Json -InputObject @($items.ToArray()) -Depth 100 | Set-Content -LiteralPath (Join-Path $archiveRoot "$endpoint.json") -Encoding utf8NoBOM
  Write-Output "Archived $endpoint`: $($items.Count) records"
}
foreach ($path in @('','projects','experience','blog','blog/220','blog/189','blog/121')) {
  $filename = if ($path -eq '') {'home'} else {$path.Replace('/','-')}
  $null = Fetch-Text ('https://spatovaliyski.com/' + $path) "current-site/$filename.html"
}
$null = Fetch-Asset 'https://wp.spatovaliyski.com/resume/' 'migration-export/originals/resume-legacy.pdf' 'Migration recovery only; outdated CV' 'Owner-authored CV; verify and replace before publication' 'Martin Spatovaliyski legacy CV'
$mediaManifest = [Collections.Generic.List[object]]::new()
foreach ($media in $collections.media) {
  if (-not $media.source_url) { continue }
  $mediaUri = [Uri]$media.source_url
  $extension = [IO.Path]::GetExtension($mediaUri.AbsolutePath)
  if (-not $extension -or $extension.Length -gt 10) { $extension = '.bin' }
  $assetPath = "migration-export/originals/wp-$($media.id)$extension"
  $record = Fetch-Asset $media.source_url $assetPath 'Original public WordPress media for migration recovery' 'Previously published on the owner portfolio; copyright/license requires editorial confirmation' $media.alt_text
  $mediaManifest.Add([pscustomobject]@{id=$media.id;sourceUrl=$media.source_url;mimeType=$media.mime_type;title=$media.title.rendered;alt=$media.alt_text;path=$assetPath;downloaded=($null -ne $record);width=$media.media_details.width;height=$media.media_details.height;originalFilename=$media.media_details.original_image})
  if ($media.media_details.original_image) {
    $fullOriginalUrl = [Uri]::new($mediaUri, $media.media_details.original_image).AbsoluteUri
    if ($fullOriginalUrl -ne $media.source_url) { $null = Fetch-Asset $fullOriginalUrl "migration-export/originals/wp-$($media.id)-original$extension" 'Full-resolution original retained by WordPress' 'Previously published portfolio media; rights require editorial confirmation' $media.alt_text }
  }
}
foreach ($project in $collections.work_projects) {
  $media = $collections.media | Where-Object id -eq $project.featured_media | Select-Object -First 1
  if ($media) {
    $extension = [IO.Path]::GetExtension(([Uri]$media.source_url).AbsolutePath)
    $publicPath = "public/media/project-$($project.slug)$extension"
    $null = Fetch-Asset $media.source_url $publicPath 'Historical project screenshot; owner supplied through old portfolio' 'Previously published portfolio media; preserve attribution; confirm right to reuse client images' ("Screenshot of " + [Net.WebUtility]::HtmlDecode($project.title.rendered))
  }
}
$bausyHome = Fetch-Text 'https://bausy.app/' 'bausy/home.html'
$appStoreResponse = Fetch-Text 'https://itunes.apple.com/lookup?id=6787374200&country=bg' 'bausy/app-store-lookup.json'
$null = Fetch-Text 'https://apps.apple.com/bg/app/bausy/id6787374200' 'bausy/app-store.html'
$null = Fetch-Text 'https://play.google.com/store/apps/details?id=com.bausy.app&hl=en' 'bausy/google-play.html'
if ($appStoreResponse) {
  $app = (ConvertFrom-Json -InputObject $appStoreResponse.Content -Depth 100).results[0]
  $null = Fetch-Asset $app.artworkUrl512 'public/media/bausy-icon.jpg' 'Bausy App Store product icon' 'Owner product artwork from Apple public listing; used to identify Bausy' 'Bausy app icon'
  $position = 1
  foreach ($screenshot in $app.screenshotUrls) {
    $largeScreenshot = $screenshot -replace '/320x480bb.jpg$', '/1284x2778bb.jpg'
    $null = Fetch-Asset $largeScreenshot "public/media/bausy-screen-$position.jpg" 'Bausy App Store product screenshot' 'Owner product marketing screenshot from Apple public listing; no generated product UI' "Bausy published product screenshot $position"
    $position++
  }
}
$addons = [Collections.Generic.List[object]]::new()
foreach ($name in @('PlateSCT','ClassicNumbersEx','EasySummon','RaidOpacity','sBoard','EasyMill')) {
  $repoResponse = Fetch-Text "https://api.github.com/repos/Spatovaliyski/$name" "github/$name-repository.json"
  if (-not $repoResponse) { continue }
  $repo = ConvertFrom-Json -InputObject $repoResponse.Content -Depth 100
  $readmeResponse = Fetch-Text "https://api.github.com/repos/Spatovaliyski/$name/readme" "github/$name-readme-api.json"
  $readme = ''
  if ($readmeResponse) {
    $readmeData = ConvertFrom-Json -InputObject $readmeResponse.Content -Depth 100
    $readme = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($readmeData.content.Replace("`n",'')))
    [IO.File]::WriteAllText((Join-Path $rawRoot "github/$name-README.md"), $readme, [Text.UTF8Encoding]::new($false))
  }
  $null = Fetch-Text "https://api.github.com/repos/Spatovaliyski/$name/releases?per_page=100" "github/$name-releases.json"
  $links = @([regex]::Matches($readme,'https?://[^\s<>\)\]"'']+') | ForEach-Object { $_.Value.TrimEnd('.') } | Sort-Object -Unique)
  $distributionLinks = [Collections.Generic.List[object]]::new()
  foreach ($link in $links) {
    if ($link -match 'curseforge\.com/wow/addons/|wowinterface\.com/downloads|wago\.io') {
      try { $response = Invoke-WebRequest -Uri $link -TimeoutSec 30; $distributionLinks.Add([pscustomobject]@{url=$link;status=[int]$response.StatusCode;verified=$true}) }
      catch { $distributionLinks.Add([pscustomobject]@{url=$link;status=$null;verified=$false;error=$_.Exception.Message}) }
    }
  }
  $addons.Add([pscustomobject]@{name=$name;description=$repo.description;source=$repo.html_url;homepage=$repo.homepage;repositoryId=$repo.id;language=$repo.language;createdAt=$repo.created_at;updatedAt=$repo.updated_at;archived=$repo.archived;defaultBranch=$repo.default_branch;license=$repo.license;distribution=@($distributionLinks.ToArray());readmePath="raw/github/$name-README.md"})
  Write-Output "Verified addon source: $name"
}
ConvertTo-Json -InputObject @($addons.ToArray()) -Depth 30 | Set-Content -LiteralPath (Join-Path $archiveRoot 'addons-evidence.json') -Encoding utf8NoBOM
ConvertTo-Json -InputObject @($mediaManifest.ToArray()) -Depth 20 | Set-Content -LiteralPath (Join-Path $archiveRoot 'media-manifest.json') -Encoding utf8NoBOM
ConvertTo-Json -InputObject @($requests.ToArray()) -Depth 20 | Set-Content -LiteralPath (Join-Path $archiveRoot 'request-manifest.json') -Encoding utf8NoBOM
ConvertTo-Json -InputObject @($assets.ToArray()) -Depth 20 | Set-Content -LiteralPath (Join-Path $archiveRoot 'asset-manifest.json') -Encoding utf8NoBOM
ConvertTo-Json -InputObject @($assets.ToArray() | Where-Object path -like 'public/media/*') -Depth 20 | Set-Content -LiteralPath (Join-Path $publicRoot 'source-rights-manifest.json') -Encoding utf8NoBOM
ConvertTo-Json -InputObject @($errors.ToArray()) -Depth 20 | Set-Content -LiteralPath (Join-Path $archiveRoot 'missing-item-report.json') -Encoding utf8NoBOM
$summary = [pscustomobject]@{retrievedAt=$retrieved;source='https://wp.spatovaliyski.com';archiveScope='Public REST records and original publicly served media only. Does not include private drafts, database, server configuration, or plugin sources.';counts=[pscustomobject]@{projects=$collections.work_projects.Count;experience=$collections.work_experience.Count;posts=$collections.posts.Count;pages=$collections.pages.Count;media=$collections.media.Count;downloadedAssets=$assets.Count;addons=$addons.Count};errors=$errors.Count}
$summary | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $archiveRoot 'archive-summary.json') -Encoding utf8NoBOM
$summary | ConvertTo-Json -Depth 10 -Compress
