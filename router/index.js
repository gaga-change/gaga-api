const mongoose = require('mongoose')
const Router = require('koa-router')
const checkAdmin = require('../middleware/checkAdmin')
const checkAuth = require('../middleware/checkAuth')

module.exports = ({ plugin, user, model, project }) => {
  const { prefix = '' } = project
  let modelsMap = {}
  router = new Router({ prefix })
  model.forEach(mod => {
    const { schema, timestamps, name, dbName, apiName, apiConfig = {} } = mod
    const Schema = mongoose.Schema;
    let checkExistArr = []

    Object.keys(schema).forEach(key => {
      let item = schema[key]
      if (item.ref && item.checkExist) {
        delete item.checkExist
        checkExistArr.push({ key, ref: item.ref })
      }
    })
    const CreateSchema = new Schema({
      ...schema,
      author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }, {
      timestamps,
    });
    let Model = mongoose.model(name, CreateSchema, dbName)
    modelsMap[name] = Model
    // modelMap.set(name,Model )
    const controller = {
      res(data, errMsg, code, ctx) {
        ctx.status = code;
        if (errMsg) {
          ctx.body = errMsg;
        } else {
          ctx.body = data;
        }
      },
      error(ctx, errMsg, code) {
        this.res(null, errMsg, code || 400, ctx);
      },
      success(ctx, data, code) {
        this.res(data, null, code || 200, ctx);
      },
      async index(ctx) {
        const query = ctx.query;
        const pageSize = Number(ctx.query.pageSize) || 20;
        const page = Number(ctx.query.pageNum) || 1;
        const params = { ...query };
        const { _select, _populates, _sort } = params;
        delete params._select;
        delete params._populates;
        delete params._sort;
        delete params.pageSize;
        delete params.pageNum;
        if (apiConfig.private) { // 如果私有，增加查询条件为个人
          params.author = ctx.session.user._id
        }
        const mongoQuery = Model.find(params)
          .limit(pageSize)
          .skip((page - 1) * pageSize);
        if (_sort !== '' && (apiConfig.defaultIndexSort || _sort)) { // 默认排序 | 可被覆盖
          mongoQuery.sort(_sort || apiConfig.defaultIndexSort)
        }
        if (_select !== '' && (apiConfig.defaultIndexSelect || _select)) { // 默认字段筛选 | 可被覆盖
          mongoQuery.select(_select || apiConfig.defaultIndexSelect);
        }
        if (_populates !== '' && (apiConfig.defaultIndexPopulates || _populates)) { // 默认关联文档显示 | 可被覆盖
          if (_populates) {
            _populates.split(' ').forEach(v => mongoQuery.populate(v));
          } else {
            apiConfig.defaultIndexPopulates.forEach(v => mongoQuery.populate(v));
          }
        }
        const list = await mongoQuery;
        this.success(ctx, {
          total: await Model.countDocuments(params),
          list,
        });
      },
      async show(ctx) {
        const { id } = ctx.params;
        const { _select, _populates } = ctx.query;
        let params = { _id: id }
        if (apiConfig.private) { // 如果私有，增加查询条件为个人
          params.author = ctx.session.user._id
        }
        const mongoQuery = Model.findOne(params);
        if (_select !== '' && (_select || apiConfig.defaultShowSelect)) { // 默认字段筛选 | 可被覆盖
          mongoQuery.select(_select || apiConfig.defaultShowSelect);
        }
        if (_populates !== '' && (apiConfig.defaultShowPopulates || _populates)) { // 默认关联文档显示 | 可被覆盖
          if (_populates) {
            _populates.split(' ').forEach(v => mongoQuery.populate(v));
          } else {
            apiConfig.defaultShowPopulates.forEach(v => mongoQuery.populate(v));
          }
        }
        const item = await mongoQuery;

        ctx.assert(item, 404, '资源不存在');
        this.success(ctx, item);
      },
      async create(ctx) {
        let body = ctx.request.body;
        let item = new Model(body);
        item.author = ctx.session.user
        for (let i = 0; i < checkExistArr.length; i++) {
          let { key, ref } = checkExistArr[i]
          let M = modelsMap[ref]
          ctx.assert(body[key], 400, `字段【${key}】必填`)
          let m = await M.findById(body[key])
          if (!m) {
            ctx.assert(m, 400, `资源已被删除,请刷新页面`)
            return await item.remove()
          }
        }
        this.success(ctx, await item.save(), 201);

      },
      async destroy(ctx) {
        const { id } = ctx.params;
        const temp = await Model.deleteOne({ _id: id, author: ctx.session.user._id });
        ctx.assert(temp.deletedCount === 1, 404, '资源不存在');
        this.success(ctx, null, 204);
      },
      async update(ctx) {
        const { id } = ctx.params;
        const { body } = ctx.request
        ctx.assert(Object.keys(body).length, 400, '参数不能为空');
        const res = await Model.updateOne({ _id: id, author: ctx.session.user._id }, body);
        ctx.assert(res.nModified === 1, 404, '资源不存在');
        for (let i = 0; i < checkExistArr.length; i++) {
          let { key, ref } = checkExistArr[i]
          let M = modelsMap[ref]
          if (body[key]) {
            let m = await M.findById(body[key])
            if (!m) {
              ctx.assert(m, 400, `资源已被删除,请刷新页面`)
              return await item.deleteOne({_id: id})
            }
          }
        }
        this.success(ctx, null, 204);
      }
    }
    let temp = [
      ['get', `/${apiName}`, controller.index.bind(controller)],
      ['get', `/${apiName}/:id`, controller.show.bind(controller)],
      ['post', `/${apiName}`, checkAuth, controller.create.bind(controller)],
      ['delete', `/${apiName}/:id`, checkAuth, controller.destroy.bind(controller)],
      ['put', `/${apiName}/:id`, checkAuth, controller.update.bind(controller)],
    ]
    if (apiConfig.private) { // 如果私有，增加查询条件为个人
      temp[0].splice(2, 0, checkAuth)
      temp[1].splice(2, 0, checkAuth)
    }
    let apiMethodsMap = {index: 0, show: 1, create: 2, destroy: 3, update:4}
    if (apiConfig.delete) {
      apiConfig.delete.forEach(key => {
        temp.splice(apiMethodsMap[key], 1)
      })
    }
    temp.forEach(([method, path, ...fun]) => {
      router[method](path, ...fun)
      console.log(`${method}\t${prefix}${path}`)
    })
  })
  return {
    router,
    modelsMap
  }
}