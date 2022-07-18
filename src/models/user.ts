import mongoose from 'mongoose';
const { Schema, model } = mongoose;

export interface UserModel {
  email: string;
  password: string;
  name: string;
  status: string;
  posts: string[];
  _doc?: any;
}

const userSchema = new Schema<UserModel>({
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    default: 'I am new!',
  },
  posts: [{ type: Schema.Types.ObjectId, ref: 'Post' }],
});

export const User = model('User', userSchema);
