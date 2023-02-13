local socket = require("socket")
local time = socket.gettime()*1000

math.randomseed(time)
math.random(); math.random(); math.random()

request = function()
  local student_id = tostring(math.random(1, 500))
  local method = "GET"
  local headers = {}

  local path = "http://10.244.2.240:7000/student/" .. student_id

  return wrk.format(method, path, headers, nil)

end
