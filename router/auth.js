const Router = require('koa-router')
const checkAdmin = require('../middleware/checkAdmin')
const checkAuth = require('../middleware/checkAuth')

module.exports = ({ plugin, user, model, project }) => {
  const userController = require('../controller/user')({user})
  const { prefix = '' } = project
  router = new Router({prefix})
  router.post(`/auth/register`, userController.register)
  console.log(`post\t${prefix}/auth/register`)
  
  router.post(`/auth/login`, userController.login)
  console.log(`post\t${prefix}/auth/login`)

  router.get(`/auth/current`, userController.current)
  console.log(`get\t${prefix}/auth/current`)

  router.post(`/auth/logout`, userController.logout)
  console.log(`post\t${prefix}/auth/logout`)

  router.post(`/auth/updatePwd`, checkAuth, userController.updatePwd)
  console.log(`post\t${prefix}/auth/updatePwd`)

  router.post(`/auth/updateAccount`, checkAuth, userController.updateAccount)
  console.log(`post\t${prefix}/auth/updateAccount`)

  return router.routes()
}