local playerState = {}
local config = Config

local function printLog(level, message)
  print(string.format('[sentinel_ac] [%s] %s', level, message))
end

local function httpPost(path, payload)
  local url = config.BackendUrl .. path
  PerformHttpRequest(url, function(status, text, headers)
    if status < 200 or status >= 300 then
      printLog('WARN', string.format('Backend %s returned %s: %s', path, tostring(status), tostring(text)))
    end
  end, 'POST', json.encode(payload), {['Content-Type'] = 'application/json'})
end

local function sendAlert(source, reason, points, extra)
  local userId = GetPlayerIdentifier(source, 0) or ('player_' .. source)
  local playerName = GetPlayerName(source) or 'Unknown'
  local state = playerState[source]
  state = state or {suspicion = 0, flags = {}, lastAlert = 0}
  state.suspicion = state.suspicion + points
  state.flags[#state.flags + 1] = {
    reason = reason,
    points = points,
    time = os.time(),
    extra = extra or {}
  }
  state.lastAlert = GetGameTimer()
  playerState[source] = state

  local payload = {
    playerId = userId,
    playerName = playerName,
    source = source,
    reason = reason,
    points = points,
    suspicion = state.suspicion,
    extra = extra or {},
    timestamp = os.time() * 1000
  }

  httpPost('/alerts', payload)
  printLog('ALERT', string.format('%s (%s) +%d -> %d', playerName, userId, points, state.suspicion))

  if state.suspicion >= config.SuspicionThreshold then
    local banReason = reason .. ' (threshold reached)'
    httpPost('/ban', {
      playerId = userId,
      playerName = playerName,
      reason = banReason,
      duration = config.BanDuration
    })
    DropPlayer(source, 'You have been banned by Sentinel AC: ' .. banReason)
  end
end

RegisterNetEvent('sentinel:playerAlert', function(data)
  local _source = source
  if not data or not data.reason or not data.points then
    return
  end
  sendAlert(_source, data.reason, data.points, data.extra)
end)

RegisterNetEvent('sentinel:playerReport', function(data)
  local _source = source
  if not data or not data.reportType then
    return
  end
  if data.reportType == 'suspiciousMovement' then
    sendAlert(_source, data.reason, data.points, data.extra)
  elseif data.reportType == 'unauthorizedWeapon' then
    sendAlert(_source, data.reason, data.points, data.extra)
  end
end)

AddEventHandler('playerDropped', function(reason)
  playerState[source] = nil
end)

CreateThread(function()
  while true do
    Wait(30000)
    local success = false
    PerformHttpRequest(config.BackendUrl .. '/health', function(status, text, headers)
      if status == 200 then
        success = true
      else
        printLog('WARN', 'Backend health check failed: ' .. tostring(status))
      end
    end, 'GET', '')
    if not success then
      printLog('INFO', 'Retrying backend health check next loop')
    end
  end
end)
