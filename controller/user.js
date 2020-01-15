const User = require('../model/User')
const only = require('only')

module.exports = {
  /**
   * 注册
   * @param {Object} ctx context
   * @returns {void} 返回用户对象
   */
  async register(ctx) {
    const { body } = ctx.request
    ctx.assert(body.email, 400, '邮箱必填')
    ctx.assert(body.password, 400, '密码必填')
    ctx.assert(body.nickname, 400, '昵称必填')
    ctx.body = await new User(body).save();
  },

  /**
   * 登入
   * @param {Object} ctx context
   * @returns {void} 返回用户对象
   */
  async login(ctx) {
    const { body } = ctx.request
    ctx.assert(body.email, 400, '邮箱必填');
    ctx.assert(body.password, 400, '密码必填');
    const findUser = await User.findOne({ email: body.email })
    ctx.assert(findUser, 400, '邮箱不存在')
    ctx.assert(findUser.authenticate(body.password), 400, '密码错误')
    ctx.body = ctx.session.user = findUser
  },

  /**
   * 查看当前登入用户
   * @param {Object} ctx context
   * @returns {void} 返回用户对象 或 返回空
   */
  async current(ctx) {
    ctx.body = ctx.session.user
  },

  /**
   * 退出登入
   * @param {Object} ctx context
   * @returns {void}
   */
  async logout(ctx) {
    ctx.session.user = null
    ctx.body = null
  },

  /**
   * 修改密码
   */
  async updatePwd(ctx) {
    const body = ctx.request.body;
    ctx.assert(body.password, '密码必填', 400);
    ctx.assert(body.newPassword, '密码必填', 400);
    const user = await User.findById(ctx.session.user._id)
    ctx.assert(user.authenticate(body.password), '密码错误', 400);
    user.password = body.newPassword
    await user.save()
    ctx.session.user = null
    ctx.body = null
  },

  /**
   * 修改个人信息
   */
  async updateAccount(ctx) {
    const body = ctx.request.body;
    delete body.password
    ctx.assert(Object.keys(body).length, 400, '参数必填')
    ctx.body = await User.findByIdAndUpdate(ctx.session.user._id, body, { new: true });
  }
}