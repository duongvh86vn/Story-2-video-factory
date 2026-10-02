param(
  [Parameter(Mandatory=$true, ParameterSetName='Synthesize')][string]$RequestPath,
  [Parameter(Mandatory=$true, ParameterSetName='List')][switch]$ListVoices
)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
  $voices = @($synth.GetInstalledVoices() | Where-Object { $_.Enabled })
  if ($ListVoices) {
    $items = @($voices | ForEach-Object { @{ id=$_.VoiceInfo.Name; language=$_.VoiceInfo.Culture.Name; gender=[string]$_.VoiceInfo.Gender } })
    ConvertTo-Json -InputObject $items -Compress
    return
  }
  $request = [System.IO.File]::ReadAllText($RequestPath, [System.Text.Encoding]::UTF8) | ConvertFrom-Json
  $requested = if ($request.locale) { [string]$request.locale } else { [string]$request.language }
  $primary = $requested.Split('-')[0].ToLowerInvariant()
  $matching = @($voices | Where-Object {
    $_.VoiceInfo.Culture.TwoLetterISOLanguageName -eq $primary -and
    (-not $requested.Contains('-') -or $_.VoiceInfo.Culture.Name -eq $requested)
  })
  if ($request.voiceId) {
    $voice = $voices | Where-Object { $_.VoiceInfo.Name -eq $request.voiceId } | Select-Object -First 1
  } else {
    $voice = $matching | Select-Object -First 1
  }
  if (-not $voice) { throw "No installed speech voice matches narration language $requested. Install a matching Windows voice or configure a multilingual TTS provider." }
  if ($voice -notin $matching) { throw "Installed voice language does not match narration language $requested." }
  $synth.SelectVoice($voice.VoiceInfo.Name)
  $synth.Rate = 0
  $synth.SetOutputToWaveFile($request.output)
  $synth.Speak([string]$request.text)
} finally { $synth.Dispose() }
