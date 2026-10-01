param([Parameter(Mandatory=$true)][string]$RequestPath)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$request = [System.IO.File]::ReadAllText($RequestPath, [System.Text.Encoding]::UTF8) | ConvertFrom-Json
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
  $voices = @($synth.GetInstalledVoices() | Where-Object { $_.Enabled })
  if ($request.voiceId) {
    $voice = $voices | Where-Object { $_.VoiceInfo.Name -eq $request.voiceId } | Select-Object -First 1
  } else {
    $voice = $voices | Where-Object { $_.VoiceInfo.Culture.TwoLetterISOLanguageName -eq $request.language } | Select-Object -First 1
  }
  if (-not $voice) { throw 'No installed speech voice matches the configured voice/language.' }
  if ($voice.VoiceInfo.Culture.TwoLetterISOLanguageName -ne $request.language) { throw 'Installed voice language does not match narration language.' }
  $synth.SelectVoice($voice.VoiceInfo.Name)
  $synth.Rate = 0
  $synth.SetOutputToWaveFile($request.output)
  $synth.Speak([string]$request.text)
} finally { $synth.Dispose() }
