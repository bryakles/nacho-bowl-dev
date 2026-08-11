$port = 8080
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://+:$port/")
try {
    $listener.Start()
    Write-Host "Server running at http://localhost:$port"
    Write-Host "Open: http://localhost:$port/index.html"
    Write-Host "Press Ctrl+C to stop."
} catch {
    Write-Host "Error: $_"
    exit 1
}

$contentTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json"
    ".png"  = "image/png"
    ".ico"  = "image/x-icon"
}

while ($listener.IsListening) {
    $ctx  = $listener.GetContext()
    $url  = ($ctx.Request.RawUrl -split '\?')[0]
    $file = Join-Path $dir $url.TrimStart('/')
    if (Test-Path $file -PathType Leaf) {
        $ext = [IO.Path]::GetExtension($file)
        $ct  = $contentTypes[$ext]
        if (-not $ct) { $ct = "application/octet-stream" }
        $ctx.Response.ContentType = $ct
        $ctx.Response.Headers.Add("Cache-Control", "no-cache, no-store, must-revalidate")
        $bytes = [IO.File]::ReadAllBytes($file)
        $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
        $ctx.Response.StatusCode = 404
        $msg = [Text.Encoding]::UTF8.GetBytes("404 Not Found")
        $ctx.Response.OutputStream.Write($msg, 0, $msg.Length)
    }
    $ctx.Response.Close()
}
