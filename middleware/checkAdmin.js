const User = require('../model/User')

module.exports = async (ctx, next) => {
  const { user } = ctx.session

  ctx.assert(user, 401, '未登录')
  ctx.assert(User.isAdmin(user), 403, '无权限')
  await next()
}