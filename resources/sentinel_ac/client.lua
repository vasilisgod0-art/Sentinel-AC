local lastCoords = nil
local lastCheck = 0
local lastVehicleSpeed = 0.0

local function getPlayerSpeed()
  local ped = PlayerPedId()
  if IsPedInAnyVehicle(ped, false) then
    local vehicle = GetVehiclePedIsIn(ped, false)
    return GetEntitySpeed(vehicle) * 3.6
  end
  return GetEntitySpeed(ped)
end

local function detectUnauthorizedWeapon()
  local ped = PlayerPedId()
  for _, weapon in ipairs(Config.SuspiciousWeapons) do
    if HasPedGotWeapon(ped, GetHashKey(weapon), false) then
      return weapon
    end
  end
  return nil
end

local function sendPlayerAlert(reason, points, extra)
  TriggerServerEvent('sentinel:playerAlert', {
    reason = reason,
    points = points,
    extra = extra
  })
end

local function checkPlayerState()
  local ped = PlayerPedId()
  if not DoesEntityExist(ped) or IsEntityDead(ped) then
    return
  end

  local coords = GetEntityCoords(ped, true)
  local time = GetGameTimer()

  if lastCoords then
    local distance = #(coords - lastCoords)
    local dt = (time - lastCheck) / 1000.0
    if dt > 0.05 then
      local speed = distance / dt
      if speed > Config.TeleportThreshold then
        sendPlayerAlert('TELEPORT_DETECTED', 40, {speed = speed})
      end
    end
  end

  local unauthorizedWeapon = detectUnauthorizedWeapon()
  if unauthorizedWeapon then
    sendPlayerAlert('UNAUTHORIZED_WEAPON:' .. unauthorizedWeapon, 30, {weapon = unauthorizedWeapon})
  end

  local vehicleSpeed = getPlayerSpeed()
  if vehicleSpeed > Config.MaxVehicleSpeed then
    sendPlayerAlert('SPEED_HACK:' .. string.format('%.1f', vehicleSpeed), 25, {speed = vehicleSpeed})
  end

  if IsEntityVisible(ped) == false then
    sendPlayerAlert('INVISIBILITY_DETECTED', 45)
  end

  if GetPlayerInvincible(PlayerId()) then
    sendPlayerAlert('GODMODE_DETECTED', 50)
  end

  lastCoords = coords
  lastCheck = time
end

CreateThread(function()
  while true do
    Wait(Config.CheckInterval)
    checkPlayerState()
  end
end)
