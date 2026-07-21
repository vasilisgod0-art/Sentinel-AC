Config = {}

Config.BackendUrl = 'http://127.0.0.1:4000/api' -- Change this to your backend URL if needed
Config.CheckInterval = 5000
Config.SuspicionThreshold = 100
Config.BanDuration = 86400000
Config.EnableBan = true
Config.AllowedWeapons = {
  'WEAPON_PISTOL',
  'WEAPON_COMBATPISTOL',
  'WEAPON_SMG',
  'WEAPON_CARBINERIFLE',
  'WEAPON_ASSAULTRIFLE'
}
Config.SuspiciousWeapons = {
  'WEAPON_RAILGUN',
  'WEAPON_HOMINGLAUNCHER',
  'WEAPON_MINIGUN',
  'WEAPON_RPG',
  'WEAPON_STINGER',
  'WEAPON_RAILGUN'
}
Config.MaxPlayerSpeed = 40.0 -- m/s
Config.MaxVehicleSpeed = 120.0 -- km/h
Config.TeleportThreshold = 80.0 -- m/s
Config.TeleportCooldown = 5000
