$r = Invoke-WebRequest -Uri 'http://localhost:4000/api/catalogos/conceptos' -Method GET -ContentType 'application/json'
Write-Host "✅ STATUS:" $r.StatusCode
$data = $r.Content | ConvertFrom-Json
$data | Select-Object -First 5 | Format-Table ConceptoCostoId, Nombre, TipoCosto, TipoCalculo -AutoSize
