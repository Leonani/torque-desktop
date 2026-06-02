# Repair all SKILL.md files - PowerShell version
# Fixes line endings (CRLF to LF) and validates YAML structure

param(
    [switch]$DryRun = $false
)

$SkillsDir = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$IssuesFixed = 0
$Warnings = 0

Write-Host "Skill Repair - Fixing SKILL.md format issues" -ForegroundColor Blue
Write-Host "==============================================" -ForegroundColor Blue
Write-Host ""

if ($DryRun) {
    Write-Host "[DRY RUN MODE - No changes will be made]" -ForegroundColor Yellow
    Write-Host ""
}

# Step 1: Fix line endings
Write-Host "[1/4] Converting CRLF to LF..." -ForegroundColor Yellow

$skillFiles = Get-ChildItem -Path $SkillsDir -Include "SKILL.md" -Recurse | Where-Object { $_.Directory.Parent.Name -eq "skills" }

foreach ($file in $skillFiles) {
    $relativePath = $file.Directory.Name + "/" + $file.Name
    
    # Read file as bytes to detect CRLF
    $bytes = [System.IO.File]::ReadAllBytes($file.FullName)
    $hasCRLF = $false
    
    for ($i = 0; $i -lt $bytes.Length - 1; $i++) {
        if ($bytes[$i] -eq 13 -and $bytes[$i + 1] -eq 10) {
            $hasCRLF = $true
            break
        }
    }
    
    if ($hasCRLF) {
        if (-not $DryRun) {
            $content = Get-Content -Path $file.FullName -Raw
            $content = $content -replace "`r`n", "`n"
            [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.UTF8Encoding]::new($false))
            Write-Host "  OK Fixed: $relativePath" -ForegroundColor Green
        } else {
            Write-Host "  Would fix: $relativePath" -ForegroundColor Yellow
        }
        $IssuesFixed++
    }
}

if ($IssuesFixed -eq 0) {
    Write-Host "  OK All files have correct line endings" -ForegroundColor Green
}

Write-Host ""

# Step 2: Validate YAML frontmatter
Write-Host "[2/4] Validating YAML frontmatter..." -ForegroundColor Yellow

foreach ($file in $skillFiles) {
    $relativePath = $file.Directory.Name + "/" + $file.Name
    $content = Get-Content -Path $file.FullName -Raw
    $lines = Get-Content -Path $file.FullName
    
    # Check opening ---
    if ($lines[0] -notmatch '^---$') {
        Write-Host "  ERR Missing opening '---': $relativePath" -ForegroundColor Red
        $Warnings++
    }
    
    # Check closing ---
    $dashCount = ($lines | Where-Object { $_ -match '^---$' }).Count
    if ($dashCount -lt 2) {
        Write-Host "  ERR Missing closing '---': $relativePath" -ForegroundColor Red
        $Warnings++
    }
    
    # Check required fields
    if ($content -notmatch '(?m)^name:') {
        Write-Host "  ERR Missing 'name' field: $relativePath" -ForegroundColor Red
        $Warnings++
    }
    
    if ($content -notmatch '(?m)^description:') {
        Write-Host "  ERR Missing 'description' field: $relativePath" -ForegroundColor Red
        $Warnings++
    }
    
    if ($content -notmatch '(?m)^license:') {
        Write-Host "  ERR Missing 'license' field: $relativePath" -ForegroundColor Red
        $Warnings++
    }
    
    if ($content -notmatch '(?m)^metadata:') {
        Write-Host "  WARN Missing 'metadata' block: $relativePath" -ForegroundColor Yellow
        $Warnings++
    }
}

Write-Host "  OK Frontmatter validation complete" -ForegroundColor Green
Write-Host ""

# Step 3: Test metadata extraction
Write-Host "[3/4] Testing metadata extraction..." -ForegroundColor Yellow
$ExtractionErrors = 0

foreach ($file in $skillFiles) {
    $relativePath = $file.Directory.Name + "/" + $file.Name
    $lines = Get-Content -Path $file.FullName
    
    # Extract name field
    $inFrontmatter = $false
    $name = $null
    
    foreach ($line in $lines) {
        if ($line -match '^---$') {
            $inFrontmatter = -not $inFrontmatter
            if (-not $inFrontmatter) { break }
            continue
        }
        
        if ($inFrontmatter -and $line -match '^name:\s*(.+)$') {
            $name = $matches[1].Trim()
            break
        }
    }
    
    if (-not $name) {
        Write-Host "  ERR Cannot extract name: $relativePath" -ForegroundColor Red
        $ExtractionErrors++
    }
}

if ($ExtractionErrors -eq 0) {
    Write-Host "  OK All skills have extractable metadata" -ForegroundColor Green
}

Write-Host ""

# Step 4: Run sync script (if available)
Write-Host "[4/4] Running sync script..." -ForegroundColor Yellow
$SyncScript = Join-Path (Join-Path (Join-Path $SkillsDir "skill-sync") "assets") "sync.sh"

if (Test-Path $SyncScript) {
    if (-not $DryRun) {
        bash $SyncScript
    } else {
        Write-Host "  [Skipped in dry-run mode]" -ForegroundColor Yellow
    }
} else {
    Write-Host "  WARN Sync script not found: $SyncScript" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==============================================" -ForegroundColor Blue

if ($IssuesFixed -gt 0) {
    Write-Host "OK Fixed $IssuesFixed line ending issue(s)" -ForegroundColor Green
}

if ($Warnings -gt 0) {
    Write-Host "WARN Found $Warnings warning(s) - review output above" -ForegroundColor Yellow
} else {
    Write-Host "OK No warnings - all skills are properly formatted" -ForegroundColor Green
}

Write-Host ""
Write-Host "Tip: If issues remain, manually check the YAML frontmatter structure." -ForegroundColor Blue
