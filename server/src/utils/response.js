// 统一响应格式
function success(data, message) {
  return { code: 0, message: message || 'success', data }
}

function fail(message, code) {
  return { code: code || -1, message, data: null }
}

module.exports = { success, fail }
