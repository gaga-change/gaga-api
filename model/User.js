
const mongoose = require('mongoose')
const crypto = require('crypto')
const { Schema } = mongoose
const TYPE = {
  ADMIN: 'admin'
}


module.exports = config => {
  const { user = {} } = config
  const { schema = {}, timestamps = true, dbName } = user

  /**
   * User Schema
   */

  const UserSchema = new Schema({
    hashedPassword: { type: String, maxlength: 100 },
    salt: { type: String },
    type: { type: String }, // 用户类型
    email: { type: String, maxlength: 100, trim: true, unique: true },  // 用户名（邮箱）
    nickname: { type: String, minlength: 1, maxlength: 10, trim: true, unique: true }, // 别名
    avatar: { type: String }, // 头像
    ...schema // 附加字段
  }, { timestamps })

  /** 虚拟属性 */
  UserSchema.virtual('password').set(function set(password) {
    this.textPassword = password
    this.salt = this.makeSalt()
    this.hashedPassword = this.encryptPassword(password)
  }).get(function get() {
    return this.textPassword
  })

  /** 实例方法 */
  UserSchema.methods = {

    /**
     * 验证 - 检测密码是否正确
     * @param {String} plainText 普通的文本（明文）
     * @returns {Boolean} 返回是否正确
     */
    authenticate(plainText) {
      return this.encryptPassword(plainText) === this.hashedPassword
    },

    /**
     * 加密 password
     * @param {String} password 明文
     * @returns {String} 密文
     */
    encryptPassword(password) {
      return crypto.
        createHmac('sha1', this.salt).
        update(password).
        digest('hex');
    },

    /**
     * 创建 salt
     * @returns {String} 返回salt
     */
    makeSalt() {
      return String(Math.round(new Date().valueOf() * Math.random()))
    }
  }

  /** 静态方法 */
  UserSchema.statics = {

    /**
     * 校验当前用户是否为管理员
     * @param {*} obj 用户实例
     * @returns {Boolean} true为管理员
     */
    isAdmin(obj) {
      return obj.type === TYPE.ADMIN
    },

    /**
     * 设置当前用户为管理员
     * @param {*} obj 用户实例
     * @returns {void}
     */
    setAdmin(obj) {
      obj.type = TYPE.ADMIN
    }
  }
  return mongoose.model('User', UserSchema, dbName)
}