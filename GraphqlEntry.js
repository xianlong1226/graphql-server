const {
  execute,
  parse,
  validateSchema,
  validate
} = require('graphql')

const GRAPHQL_LOG_TAG = '[Graphql]'

function noIntrospection (validationCtx) {
  return {
    Field (node) {
      if (node.name.value === '__schema' || node.name.value === '__type') {
        const err = new Error(`no introspection error`)
        err.statusCode = 404
        validationCtx.reportError(err)
      }
    }
  }
}

class GraphqlEntry {
  constructor ({
    schema,
    rootObject,
    dataDecorator,
    errorDecorator,
    successStatusCode = 200,
    failStatusCode = 500,
    onRequest
  }) {
    // 先校验schema
    const schemaValidationErrors = validateSchema(schema)
    if (schemaValidationErrors.length > 0) {
      this.schemaValidationError = { errors: schemaValidationErrors }
    }

    this.schema = schema
    this.rootObject = rootObject
    this.dataDecorator = dataDecorator
    this.errorDecorator = errorDecorator
    this.successStatusCode = successStatusCode
    this.failStatusCode = failStatusCode
    this.onRequest = onRequest

    this.validationRules = []

    if (process.env.ZPFE_DISABLE_GRAPHQL_INTRO === 'true' || process.env.SERVER_ENV === 'production') {
      this.validationRules.push(noIntrospection)
    }
  }

  async doExecute (ctx, payload) {
    debugger
    // 记录payload日志
    ctx.log.info(`${GRAPHQL_LOG_TAG} info`, payload)

    if (this.onRequest) {
      this.onRequest(ctx, this.rootObject, payload)
    }

    if (this.schemaValidationError) {
      this.callErrorDecorator(ctx, this.schemaValidationError, payload)
      return
    }

    // Parse
    let document
    try {
      document = parse(payload.query)
    } catch (syntaxError) {
      this.callErrorDecorator(ctx, syntaxError, payload)
      return
    }

    // Validate
    const validationErrors = validate(this.schema, document, this.validationRules)
    if (validationErrors.length > 0) {
      this.callErrorDecorator(ctx, validationErrors[0], payload)
      return
    }
    debugger
    const result = await execute(this.schema, document, this.rootObject, ctx, payload.variables)
    if (result.errors) {
      this.callErrorDecorator(ctx, result.errors[0], payload)
      return
    }

    this.callDataDecorator(ctx, result, payload)
  }

  async GET (ctx) {
    const queryString = ctx.request.query.query
    const variables = ctx.request.query.variables
    if (!queryString) return

    const payload = {
      query: queryString
    }

    if (variables) {
      try {
        payload.variables = JSON.parse(variables)
      } catch (e) {
        this.callErrorDecorator(ctx, e)
        return
      }
    }

    await this.doExecute(ctx, payload)
  }

  async POST (ctx) {
    debugger
    const query = await ctx.request.body.parse()
    const queryString = typeof query === 'string' ? query : query.query

    const payload = {
      query: queryString,
      variables: query.variables
    }

    await this.doExecute(ctx, payload)
  }

  callDataDecorator (ctx, result, payload) {
    const data = result.data || result
    if (this.dataDecorator) {
      try {
        this.dataDecorator(ctx, result, payload)
        return
      } catch (e) {
        ctx.log.error('调用dataDecorator出现异常', e)
      }
    }

    ctx.response.set({
      status: this.successStatusCode,
      data,
      requestId: ctx.request.headers.get('x-zp-request-id')
    }, this.successStatusCode)
  }

  callErrorDecorator (ctx, error, payload) {
    const originalError = error.originalError || error
    const errorMessage = originalError.message || error

    let {
      data,
      message,
      statusCode
    } = originalError

    message || (message = error)
    statusCode || (statusCode = this.failStatusCode)

    // 全局记录异常日志
    ctx.log.error(`${GRAPHQL_LOG_TAG} ${errorMessage}`, {
      data,
      message,
      statusCode,
      stack: originalError.stack
    })

    if (this.errorDecorator) {
      try {
        this.errorDecorator(ctx, error, payload)
        return
      } catch (e) {
        ctx.log.error(`${GRAPHQL_LOG_TAG} 调用errorDecorator出现异常`, e)
      }
    }

    if (statusCode === 404) {
      ctx.response.status = statusCode
    } else {
      if (!data) {
        data = {
          status: statusCode,
          message: errorMessage,
          requestId: ctx.request.headers.get('x-zp-request-id')
        }
      }

      ctx.response.set(data, statusCode)
    }
  }

  exports () {
    return {
      GET: this.GET.bind(this),
      POST: this.POST.bind(this)
    }
  }
}

module.exports = {
  GraphqlEntry
}
