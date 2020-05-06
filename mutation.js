const { GraphQLObjectType, GraphQLInt, GraphQLString } = require('graphql')
const { MutationResult } = require('./type')

const Address = {
  name: 'Address',
  type: MutationResult,
  args: {
    street: {
      type: GraphQLString,
      description: '街道'
    },
    number: {
      type: GraphQLInt,
      description: '编号'
    }
  },
  async resolve (rootValue, args, ctx, context) {
    const data1 = await new Promise((resolve, reject) => {
      resolve({
        code: 1,
        message: '处理成功'
      })
    })

    return data1
  }
}

module.exports = new GraphQLObjectType({
  name: 'rootMutation',
  description: '根变更',
  fields: {
    Address
  }
})
