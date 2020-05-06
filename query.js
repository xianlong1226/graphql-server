const { GraphQLObjectType, GraphQLInt, GraphQLString } = require('graphql')
const { AddressType } = require('./type')

const Address = {
  name: 'Address',
  type: AddressType,
  args: {
    index: {
      type: GraphQLInt,
      description: '当前索引'
    }
  },
  async resolve (rootValue, args, ctx, context) {
    const data1 = await new Promise((resolve, reject) => {
      resolve({
        street: 'a',
        number: 1
      })
    })

    return data1
  }
}

module.exports = new GraphQLObjectType({
  name: 'rootQuery',
  description: '根查询',
  fields: {
    Address
  }
})
