$asm = [System.Reflection.Assembly]::LoadFrom('C:\DigiBizzApp\notificationDll.dll')
$cls = $asm.GetType('notificationDll.ClsNotificationApp')
$obj = [Activator]::CreateInstance($cls, @("orccs554px09gwv9rqmxyahh"))

Write-Host "Api_DominName: $($obj.Api_DominName)"
foreach ($f in $cls.GetFields([System.Reflection.BindingFlags]'Public,NonPublic,Instance')) {
    $val = $f.GetValue($obj)
    if ($val -ne $null -and $val -ne "") {
        Write-Host "$($f.Name): $val"
    }
}
