const { GraphQLObjectType, GraphQLInt, GraphQLString } = require('graphql')

const AddressType = new GraphQLObjectType({
  name: 'AddressType',
  description: '地址',
  fields: {
    street: {
      type: GraphQLString,
      description: '街道'
    },
    number: {
      type: GraphQLInt,
      description: '编号'
    }
  }
})

const MutationResult = new GraphQLObjectType({
  name: 'MutationResult',
  description: '操作结果',
  fields: {
    code: {
      type: GraphQLInt,
      description: '后端返回的code'
    },
    message: {
      type: GraphQLString,
      description: '处理信息提示'
    }
  }
})

module.exports = {
  AddressType,
  MutationResult
}
