import { buildSchema } from 'graphql';

export const schema = buildSchema(`
  type Post{
    _id:ID!
    title:String!
    content:String!
    imageUrl:String!
    creator:User!
    createdAt:String!
    updatedAt:String!
  }
  type User{
    _id:ID!
    name:String!
    email:String!
    password:String!
    status:String!
    posts:[Post!]
  }
  type AuthData{
    token:String!
    userId:String!
  }
  input UserInputData{
    email:String!
    name:String!
    password:String!
  }
  input PostInputData{
    title:String!
    content:String!
    imageUrl:String!
  }
  type PostData{
    posts:[Post!]
    totalPosts:Int!
  }
  type RootMutation{
    createUser(userInput: UserInputData): User!
    createPost(postInput:PostInputData):Post!
    deletePost(id:ID!):String!
    updatePost(id:ID!,postInput:PostInputData!):Post!
    updateStatus(status:String!):User!
  }
  type RootQuery{
    posts(page:Int):PostData!
    login(email: String!,password:String!): AuthData!
    post(id:ID!):Post!
    user:User!
  }
  schema{
    query: RootQuery
    mutation: RootMutation
  }
`);
