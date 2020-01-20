const pluginDefault = {
  logger: {
    enable: true,
  }
}
const connectConfig = (def, target) => {
  Object.keys(def).forEach(key => {
    if (!target[key]) {
      target[key] = def[key]
    } else {
      Object.assign(def[key], Object.assign(def[key], target[key]))
    }
  })
}
module.exports = (config, appendRouter, options = {}) => {
  const Koa = require('koa')
  const Router = require('koa-router')
  const mongoose = require('mongoose')
  const logger = require('koa-logger')
  const koaBody = require('koa-body')
  const session = require('koa-session')
  const mainRouter = require('./router')
  const authRouter = require('./router/auth')
  const { plugin, user, model, project } = config
  connectConfig(pluginDefault, plugin)
  const app = new Koa()
  mongoose.set('useCreateIndex', true)
  mongoose.connect(plugin.mongodb.link, { useNewUrlParser: true, useUnifiedTopology: true })
  const CONFIG = {
    httpOnly: true,
    key: 'koa:sess',
    maxAge: 86400000,
    overwrite: true,
    renew: false,
    rolling: false,
    signed: true
  }
  // Session 配置
  app.keys = ['junn secret 4']
  app.use(koaBody({ jsonLimit: '10kb' }))
  app.use(session(CONFIG, app))
  if (plugin.logger.enable) {
    app.use(logger())
  }
  const { router: userRouter, User } = authRouter(config)
  app.use(userRouter.routes())
  const { router: autoRouter, modelsMap } = mainRouter(config)
  app.use(autoRouter.routes())
  if (appendRouter) {
    let router = new Router()
    appendRouter(router, { User, ...modelsMap })
    app.use(router.routes())
  }
  if (options.getKoaApp) {
    return app
  }
  app.use(async (ctx) => {
    ctx.status = 404
    ctx.body = "没有该API接口"
  })
  app.listen(project.port, () => {
    console.log(`listening: http://localhost:${project.port}`)
  })
}