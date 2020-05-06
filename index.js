const Koa = require('koa')
const bodyParser = require('koa-bodyparser')
const cors = require('@koa/cors')
const { execute,  parse,  validateSchema, validate  } = require('graphql')
const schema = require('./schema')

async function doExecute (ctx, payload) {
  const document = parse(payload.query)
  const variables = payload.variables

  // 规则校验，当设置了禁止IntrospectionQuery时，这种请求报错
  const validateRules = []
  if (process.env.DISABLE_GRAPHQL_INTRO === 'true') {
    validateRules.push((validationCtx) => {
      return {
        enter(node, key, parent, path, ancestors) {
          if (node.value === 'IntrospectionQuery') {
            validationCtx.reportError(new Error('test'))
          }
        }
      }
    })
  }
  const validationErrors = validate(schema, document, validateRules)
  if (validationErrors.length > 0) {
    ctx.body = {
      data: null,
      message: validationErrors[0].message
    }
    return
  }

  const rootObject = { root: true }

  const result = await execute(schema, document, rootObject, ctx, variables)

  // 这个地方必须要把整个result返回给前端，否则graphql-playground无法识别返回值
  ctx.body = result
}

const app = new Koa()

// 设置允许跨域
app.use(cors())
// 解析post请求中的body
app.use(bodyParser())

app.use(async ctx => {
  const query = ctx.request.method === 'GET' ? ctx.request.query : ctx.request.body
  const payload = {
    query: query.query,
    variables: query.variables
  }

  await doExecute(ctx, payload)
})

app.listen(3000)
