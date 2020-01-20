module.exports = async (ctx, next) => {
  const { user } = ctx.session

  ctx.assert(user, 401, '未登录')
  await next()
}