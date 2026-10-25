Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$proc = Get-Process -Name "WhatsApp.Root" -ErrorAction SilentlyContinue
if (-not $proc) {
    Write-Host "WhatsApp.Root not found"
    exit
}

$element = [System.Windows.Automation.AutomationElement]::FromHandle($proc[0].MainWindowHandle)
if ($element) {
    Write-Host "Found WhatsApp Main Window: $($element.Current.Name)"
} else {
    Write-Host "MainWindowHandle is zero, searching by process..."
    $condition = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ProcessIdProperty, $proc[0].Id)
    $root = [System.Windows.Automation.AutomationElement]::RootElement
    $found = $root.FindAll([System.Windows.Automation.TreeScope]::Children, $condition)
    Write-Host "Found windows: $($found.Count)"
    foreach ($w in $found) {
        Write-Host "  Window: '$($w.Current.Name)' | Class: '$($w.Current.ClassName)'"
    }
}
