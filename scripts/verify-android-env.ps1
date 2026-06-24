$ErrorActionPreference = 'Continue'

function Find-CommandPath($name) {
  $command = Get-Command $name -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }
  return $null
}

$defaultSdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
$adbFromPath = Find-CommandPath 'adb.exe'
$emulatorFromPath = Find-CommandPath 'emulator.exe'
$adbDefault = Join-Path $defaultSdk 'platform-tools\adb.exe'
$emulatorDefault = Join-Path $defaultSdk 'emulator\emulator.exe'

$adb = if ($adbFromPath) { $adbFromPath } elseif (Test-Path $adbDefault) { $adbDefault } else { $null }
$emulator = if ($emulatorFromPath) { $emulatorFromPath } elseif (Test-Path $emulatorDefault) { $emulatorDefault } else { $null }

Write-Output "Android SDK default path: $defaultSdk"
Write-Output "adb: $(if ($adb) { $adb } else { 'not found' })"
Write-Output "emulator: $(if ($emulator) { $emulator } else { 'not found' })"

if ($adb) {
  & $adb version
  $deviceOutput = & $adb devices
  $deviceOutput
  $connectedDevices = @($deviceOutput | Select-String -Pattern "`tdevice$")
} else {
  $connectedDevices = @()
}

if ($emulator) {
  & $emulator -list-avds
}

if (-not $adb) {
  Write-Output 'Android verification environment is incomplete on this machine.'
  exit 2
}

if ($connectedDevices.Count -eq 0 -and -not $emulator) {
  Write-Output 'adb is available, but no connected Android device or emulator command was found.'
  exit 3
}

Write-Output 'Android verification environment is available.'
