$ErrorActionPreference = 'Stop'
$workspaceRoot = 'C:\Users\Martin\Desktop\Portfolio'
$exportRoot = Join-Path $workspaceRoot 'migration-export'
$mediaRoot = Join-Path $workspaceRoot 'public/media'
$retrievedAt = [DateTime]::UtcNow.ToString('o')
$addonDefinitions = @{
  PlateSCT = @{summary='Floating combat text on enemy nameplates, with damage thresholds, abbreviations, configurable number styles, and optional critical-hit sounds.';distribution='https://www.curseforge.com/wow/addons/platesct';status='active';toc='PlateSCT.toc';authors=@('Limitedby');image='/media/addon-platesct-combat.png';notes='Midnight/Forever personal damage attribution is experimental; do not promise exact ownership under restricted APIs.'}
  ClassicNumbersEx = @{summary='A maintenance update to the original ClassicNumbers addon. Its Midnight features have moved into PlateSCT.';distribution='https://www.curseforge.com/wow/addons/classicnumbers-ex';status='discontinued';toc='ClassicNumbersEx.toc';authors=@('zeldarsprod','Limitedby');image=$null;notes='The current manifest and author distribution page explicitly say this addon is no longer supported. Credit the original author.'}
  EasySummon = @{summary='Detects summon requests in chat and gives Warlocks an organized summon queue, with list and grid views.';distribution='https://www.curseforge.com/wow/addons/easysummon';status='published';toc='EasySummon.toc';authors=@('Limitedby');image='/media/addon-easysummon.jpg';notes='Public description supports Classic and TBC party/raid use; no adoption metrics included.'}
  RaidOpacity = @{summary='Controls opacity and background fade levels for in-range and out-of-range Blizzard raid frames.';distribution='https://www.curseforge.com/wow/addons/raidopacity';status='published';toc='RaidOpacity.toc';authors=@('Limitedby');image='/media/addon-raidopacity.png';notes='GitHub manifest is v1.0.0; public CurseForge listing serves 1.0.1. Do not equate repository pushes with distribution release times.'}
  sBoard = @{summary='Collects chat messages into a tidy services list.';distribution=$null;status='source-available';toc='ServicesBoard.toc';authors=@('Limitedby');image=$null;notes='Public manifest title is Services Board. External distribution and screenshots are not confirmed; link to the verified GitHub repository only.'}
  EasyMill = @{summary='Finds millable herbs and estimates batch profit or loss using Auctionator pricing, with a test mode.';distribution='https://www.curseforge.com/wow/addons/easymill';status='published';toc='EasyMill.toc';authors=@('Limitedby');image='/media/addon-easymill.png';notes='The estimates use Auctionator pricing; they are not guaranteed sale results.'}
}
$addons = Get-Content -LiteralPath (Join-Path $exportRoot 'addons-evidence.json') -Raw | ConvertFrom-Json
foreach ($addon in $addons) {
  $definition = $addonDefinitions[$addon.name]
  $addon.readmePath = $null
  $addon.distribution = if ($definition.distribution) { @([pscustomobject]@{url=$definition.distribution;verified=$true;verification='Author public listing inspected using web connector; direct shell archive returned HTTP 403';retrievedAt=$retrievedAt}) } else { @() }
  $addon | Add-Member -NotePropertyName summary -NotePropertyValue $definition.summary -Force
  $addon | Add-Member -NotePropertyName maintenanceStatus -NotePropertyValue $definition.status -Force
  $addon | Add-Member -NotePropertyName authors -NotePropertyValue $definition.authors -Force
  $addon | Add-Member -NotePropertyName tocPath -NotePropertyValue "raw/github/$($addon.name)-$($definition.toc)" -Force
  $addon | Add-Member -NotePropertyName image -NotePropertyValue $definition.image -Force
  $addon | Add-Member -NotePropertyName editorialNotes -NotePropertyValue $definition.notes -Force
}
ConvertTo-Json -InputObject @($addons) -Depth 30 | Set-Content -LiteralPath (Join-Path $exportRoot 'addons-evidence.json') -Encoding utf8NoBOM
$newAssets = @(
  @{path='public/media/project-cilect-interface.png';url='https://wp.spatovaliyski.com/wp-content/uploads/2023/12/chrome_T3hOZ8zGm1-e1702640198808.png';page='https://spatovaliyski.com/projects';alt='CILECT homepage showing association navigation and editorial cards';purpose='Legacy owner portfolio project screenshot';rights='Published on the owner portfolio; confirm client imagery reuse before final publication'}
  @{path='public/media/martin-portrait.jpg';url='https://wp.spatovaliyski.com/wp-content/uploads/2022/10/1620037891381.jpg';page='https://spatovaliyski.com/';alt='Portrait of Martin Spatovaliyski';purpose='Owner portrait from the existing portfolio';rights='Previously published owner portrait; owner requested portfolio migration'}
  @{path='public/media/addon-platesct-combat.png';url='https://media.forgecdn.net/attachments/2043/596/platesct_damage1-png.png';page='https://www.curseforge.com/wow/addons/platesct/gallery';alt='PlateSCT damage numbers over a World of Warcraft enemy nameplate';purpose='Published addon combat screenshot';rights='Owner addon screenshot from author distribution page; World of Warcraft imagery belongs to Blizzard Entertainment'}
  @{path='public/media/addon-platesct-settings.png';url='https://media.forgecdn.net/attachments/2040/936/platesct_settings1.png';page='https://www.curseforge.com/wow/addons/platesct/gallery';alt='PlateSCT settings window with combat options and appearance preview';purpose='Published addon settings screenshot';rights='Owner addon screenshot from author distribution page; World of Warcraft imagery belongs to Blizzard Entertainment'}
  @{path='public/media/addon-platesct-icon.png';url='https://raw.githubusercontent.com/Spatovaliyski/PlateSCT/main/Media/psct-logo-mini.png';page='https://github.com/Spatovaliyski/PlateSCT';alt='PlateSCT addon icon';purpose='Addon product icon';rights='Owner addon asset from its public source repository; license is not declared by the GitHub API'}
  @{path='public/media/addon-raidopacity.png';url='https://media.forgecdn.net/attachments/1466/992/raidopacity.png';page='https://www.curseforge.com/wow/addons/raidopacity';alt='RaidOpacity showing raid members at different opacity levels';purpose='Published addon screenshot';rights='Owner addon screenshot from author distribution page; World of Warcraft imagery belongs to Blizzard Entertainment'}
  @{path='public/media/addon-easysummon.jpg';url='https://media.forgecdn.net/attachments/1435/816/easysummon_1.jpg';page='https://www.curseforge.com/wow/addons/easysummon';alt='EasySummon request queue in World of Warcraft';purpose='Published addon screenshot';rights='Owner addon screenshot from author distribution page; World of Warcraft imagery belongs to Blizzard Entertainment'}
  @{path='public/media/addon-easymill.png';url='https://media.forgecdn.net/attachments/1246/528/easymill_01.png';page='https://www.curseforge.com/wow/addons/easymill';alt='EasyMill milling interface and pricing details';purpose='Published addon screenshot';rights='Owner addon screenshot from author distribution page; World of Warcraft imagery belongs to Blizzard Entertainment'}
)
$assetManifest = [Collections.Generic.List[object]]::new()
foreach ($asset in @(Get-Content -LiteralPath (Join-Path $exportRoot 'asset-manifest.json') -Raw | ConvertFrom-Json)) { if ($asset.path -notin @($newAssets.path)) { $assetManifest.Add($asset) } }
foreach ($asset in $newAssets) {
  $path = Join-Path $workspaceRoot $asset.path
  $assetManifest.Add([pscustomobject]@{sourceUrl=$asset.url;sourcePage=$asset.page;path=$asset.path;purpose=$asset.purpose;rights=$asset.rights;alt=$asset.alt;retrievedAt=$retrievedAt;sha256=(Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLower();bytes=(Get-Item -LiteralPath $path).Length})
}
ConvertTo-Json -InputObject @($assetManifest.ToArray()) -Depth 30 | Set-Content -LiteralPath (Join-Path $exportRoot 'asset-manifest.json') -Encoding utf8NoBOM
ConvertTo-Json -InputObject @($assetManifest.ToArray() | Where-Object path -like 'public/media/*') -Depth 30 | Set-Content -LiteralPath (Join-Path $mediaRoot 'source-rights-manifest.json') -Encoding utf8NoBOM
$projects = @(Get-Content -LiteralPath (Join-Path $exportRoot 'work_projects.json') -Raw | ConvertFrom-Json)
$experience = @(Get-Content -LiteralPath (Join-Path $exportRoot 'work_experience.json') -Raw | ConvertFrom-Json)
$posts = @(Get-Content -LiteralPath (Join-Path $exportRoot 'posts.json') -Raw | ConvertFrom-Json)
$pages = @(Get-Content -LiteralPath (Join-Path $exportRoot 'pages.json') -Raw | ConvertFrom-Json)
$media = @(Get-Content -LiteralPath (Join-Path $exportRoot 'media.json') -Raw | ConvertFrom-Json)
$appStore = (Get-Content -LiteralPath (Join-Path $exportRoot 'raw/bausy/app-store-lookup.json') -Raw | ConvertFrom-Json).results[0]
$facts = [pscustomobject]@{
  verifiedAt=$retrievedAt
  profile=[pscustomobject]@{name='Martin Spatovaliyski';email='martinspatovaliyski@gmail.com';github='https://github.com/Spatovaliyski';linkedin='https://www.linkedin.com/in/martin-spatovaliyski-554622aa/';availability=$false;availabilitySource='raw/wordpress/availability.json';portrait='/media/martin-portrait.jpg'}
  bausy=[pscustomobject]@{title='Bausy';summary='A pet-care app that brings pet profiles, health records, reminders, and shared access together.';website='https://bausy.app/';android='https://play.google.com/store/apps/details?id=com.bausy.app';ios='https://apps.apple.com/bg/app/bausy/id6787374200';seller=$appStore.sellerName;bundleId=$appStore.bundleId;initialAppStoreRelease=$appStore.releaseDate;currentAppStoreVersion=$appStore.version;currentAppStoreRelease=$appStore.currentVersionReleaseDate;features=@('Pet profiles and veterinary records','Vaccination and medication reminders','Weight history and charts','Document storage','Family pet sharing with view/edit permissions','Sharo AI pet assistant','Watchdog health alerts');image='/media/bausy-screen-1.jpg';screenshots=@(1..8 | ForEach-Object {"/media/bausy-screen-$_.jpg"});source='raw/bausy/app-store-lookup.json';editorialStatus='Public product overview verified. Personal architecture, decisions, release workflow, and outcomes still require owner-approved content.'}
  projects=@($projects | ForEach-Object {[pscustomobject]@{legacyId=$_.id;title=[Net.WebUtility]::HtmlDecode($_.title.rendered);slug=$_.slug;publishedAtUtc=(([DateTime]$_.date_gmt).ToString('yyyy-MM-ddTHH:mm:ss')+'Z');modifiedAtUtc=(([DateTime]$_.modified_gmt).ToString('yyyy-MM-ddTHH:mm:ss')+'Z');oldBackendUrl=$_.link;oldFrontendUrl='https://spatovaliyski.com/projects';summary=[Net.WebUtility]::HtmlDecode($_.the_content.Trim());year=$_.end_year;technologies=$_.tags;link=$_.repository;featuredMediaId=$_.featured_media;importStatus='draft'}})
  experience=@($experience | ForEach-Object {[pscustomobject]@{legacyId=$_.id;employer=[Net.WebUtility]::HtmlDecode($_.title.rendered);slug=$_.slug;title=$_.company_position;startDateAsPublished=$_.start_year;endDateAsPublished=$_.end_year;location=$_.location;body=[Net.WebUtility]::HtmlDecode($_.the_content);source=$_.link;editorialStatus='Owner-published claims; confirm dates and numerical claims before republishing'}})
  notes=@($posts | ForEach-Object {[pscustomobject]@{legacyId=$_.id;title=[Net.WebUtility]::HtmlDecode($_.title.rendered);slug=$_.slug;publishedAtUtc=(([DateTime]$_.date_gmt).ToString('yyyy-MM-ddTHH:mm:ss')+'Z');oldFrontendUrl="https://spatovaliyski.com/blog/$($_.id)";oldBackendUrl=$_.link;newPath="/notes/$($_.slug)/";bodyArchive='posts.json';importStatus='draft'}})
  addons=@($addons)
}
$facts | ConvertTo-Json -Depth 50 | Set-Content -LiteralPath (Join-Path $exportRoot 'verified-content.json') -Encoding utf8NoBOM
$legacyUrls = [Collections.Generic.List[object]]::new()
foreach ($route in @('/','/projects','/experience','/blog','/resume')) { $legacyUrls.Add([pscustomobject]@{url=('https://spatovaliyski.com'+$route);kind='frontend-collection';suggestedTarget=if ($route -eq '/blog') {'/notes/'} else {$route.TrimEnd('/')+'/'}}) }
foreach ($post in $facts.notes) { $legacyUrls.Add([pscustomobject]@{url=$post.oldFrontendUrl;kind='frontend-post';suggestedTarget=$post.newPath}) }
foreach ($record in @($projects)+@($experience)+@($posts)+@($pages)) { $legacyUrls.Add([pscustomobject]@{url=$record.link;kind='wordpress-public-record';legacyId=$record.id;type=$record.type}) }
$legacyUrls.Add([pscustomobject]@{url='https://wp.spatovaliyski.com/resume/';kind='legacy-pdf';suggestedTarget='/resume/'})
ConvertTo-Json -InputObject @($legacyUrls.ToArray()) -Depth 20 | Set-Content -LiteralPath (Join-Path $exportRoot 'url-inventory.json') -Encoding utf8NoBOM
$unsupported = [Collections.Generic.List[object]]::new()
foreach ($record in @($projects)+@($experience)+@($posts)+@($pages)) {
  $body = [string]$record.content.rendered
  $unsafeTags = @([regex]::Matches($body,'<(script|iframe|object|embed|form|style)\b','IgnoreCase') | ForEach-Object {$_.Groups[1].Value.ToLower()} | Sort-Object -Unique)
  $shortcodes = @([regex]::Matches($body,'\[(?:[a-zA-Z][a-zA-Z0-9_-]*)(?:\s|\])') | ForEach-Object Value | Sort-Object -Unique)
  if ($unsafeTags.Count -or $shortcodes.Count -or $record.slug -in @('slider','pricing-calculator')) { $unsupported.Add([pscustomobject]@{legacyId=$record.id;type=$record.type;slug=$record.slug;unsupportedTags=$unsafeTags;possibleShortcodes=$shortcodes;action='Retain original export; review manually rather than execute or publish automatically'}) }
}
ConvertTo-Json -InputObject @($unsupported.ToArray()) -Depth 20 | Set-Content -LiteralPath (Join-Path $exportRoot 'unsupported-content-report.json') -Encoding utf8NoBOM
$summary = Get-Content -LiteralPath (Join-Path $exportRoot 'archive-summary.json') -Raw | ConvertFrom-Json
$summary.counts.downloadedAssets = $assetManifest.Count
$summary | Add-Member -NotePropertyName mediaReconciliation -NotePropertyValue ([pscustomobject]@{publicMediaRecords=$media.Count;downloadedOriginals=@($media | Where-Object {Test-Path -LiteralPath (Join-Path $exportRoot ('originals/wp-'+$_.id+[IO.Path]::GetExtension(([Uri]$_.source_url).AbsolutePath)))}).Count;missingOriginals=0;rootReadme404s=6;failedCurseForgeHtmlArchives=5;curseForgeDescriptionsVerifiedBy='web connector'}) -Force
$summary | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath (Join-Path $exportRoot 'archive-summary.json') -Encoding utf8NoBOM
Write-Output 'Wrote verified-content.json, URL inventory, unsupported-content report, and source/rights manifests.'
