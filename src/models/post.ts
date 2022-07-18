import mongoose, { ObjectId } from 'mongoose';

const { Schema, model } = mongoose;

export interface PostModel {
  title: string;
  imageUrl: string;
  content: string;
  creator: ObjectId;
  createdAt: Date;
  updatedAt: Date;
  _doc?: any;
}

const postSchema = new Schema<PostModel>(
  {
    title: {
      type: String,
      required: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    creator: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

export const Post = model('Post', postSchema);
