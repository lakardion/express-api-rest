import { NextFunction, RequestHandler } from 'express';
import { Result, ValidationError, validationResult } from 'express-validator';
import {
  Forbidden,
  InternalServerError,
  NotFound,
  RequestValidationError,
  Unauthorized,
} from '../errors/index.js';
import { Post, User, UserModel } from '../models/index.js';
import { unlink } from 'fs/promises';
import path from 'path';
import { __basedirname } from '../../app.js';
import { createValidationError } from './utls/index.js';
import { RequestWithUserId } from '../middleware/is-auth.js';
import { HydratedDocument } from 'mongoose';

const deleteImage = (imageRelPath: string) => {
  const imagePath = path.join(__basedirname, imageRelPath);
  return unlink(imagePath).catch((reason) =>
    console.error('File delete failed', reason)
  );
};

export const getPosts: RequestHandler = async (req, res, next) => {
  const { currentPage } = req.query;
  const page = typeof currentPage === 'string' ? parseInt(currentPage) : 1;
  const perPage = 2;

  try {
    const totalItems = await Post.countDocuments();
    const posts = await Post.find()
      .skip((page - 1) * perPage)
      .limit(perPage);
    res.status(200).json({
      message: 'Fetched posts successfully',
      posts: posts,
      totalItems,
    });
  } catch (getPostsError) {
    console.error({ getPostsError });
    const error = new InternalServerError(
      'Something went wrong when trying to get posts from our servers'
    );
    next(error);
  }
};

export const createPost: RequestHandler = async (
  req: RequestWithUserId,
  res,
  next
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return createValidationError(next, errors.array());
  }

  const { path: imageUrl } = req.file ?? {};
  if (!imageUrl) {
    const error = new RequestValidationError(
      'Validation failed, there was missing data',
      [{ msg: 'Image is required', param: 'image' }]
    );
    return next(error);
  }
  const { title, content } = req.body;

  try {
    const post = new Post({
      content,
      title,
      imageUrl,
      creator: req.userId,
    });
    const createdPost = await post.save();
    const user = await User.findById(req.userId);
    //todo: check if there's a way to properly type mongoose here
    const unknownPosts: any[] = user.posts;
    unknownPosts.push(createdPost);
    await user.save();
    res.status(201).json({
      message: 'Post created successfully!',
      post: createdPost,
      creator: {
        _id: user._id,
        name: user.name,
      },
    });
  } catch (createPostError) {
    console.error({ createPostError });
    const error = new InternalServerError('Error while creating a post');
    return next(error);
  }
};

export const getPost: RequestHandler = async (req, res, next) => {
  const { postId } = req.params;
  try {
    const post = await Post.findById(postId);
    if (!post) {
      const error = new NotFound('Could not find post');
      return next(error);
    }
    res.status(200).json({ post });
  } catch (getPostError) {
    console.error({ getPostError });
    const error = new InternalServerError('Error while trying to get post');
    next(error);
  }
};

export const editPost: RequestHandler = async (
  req: RequestWithUserId,
  res,
  next
) => {
  const { postId } = req.params;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return createValidationError(next, errors.array());
  }

  const { title, content, imageUrl: imageUrlFromBody } = req.body;
  const { path: imageUrlFromFile } = req.file ?? {};
  const imageUrl = imageUrlFromFile ?? imageUrlFromBody;
  if (!imageUrl) {
    return createValidationError(next, [
      {
        msg: 'Image is required',
        param: 'image',
        value: undefined,
        location: 'body',
      },
    ]);
  }
  try {
    const post = await Post.findById(postId);
    if (post.creator.toString() !== req.userId)
      return next(new Forbidden("You're not allowed to modify this resource"));
    const shouldDeleteOldFile = imageUrlFromFile && post.imageUrl;
    //I don't care if this does not complete right away.
    if (shouldDeleteOldFile) deleteImage(post.imageUrl);

    post.content = content;
    post.title = title;
    post.imageUrl = imageUrl;
    await post.save();

    res.status(200).json({
      message: 'Post updated successfully',
      post,
    });
  } catch (editError) {
    console.error({ editError });
    const error = new InternalServerError(
      'Something went wrong when trying to update a post'
    );
    return next(error);
  }
};

export const deletePost: RequestHandler = async (
  req: RequestWithUserId,
  res,
  next
) => {
  const { postId } = req.params;
  try {
    const post = await Post.findById(postId);
    if (post.creator.toString() !== req.userId)
      return next(new Forbidden("You're not allowed to modify this resource"));
    const user: HydratedDocument<UserModel> = await User.findById(req.userId);
    if (!post) {
      const error = new NotFound('Post not found');
      return next(error);
    }
    const imageUrl = post.imageUrl;
    await post.remove();
    //TODO: Need to research more about mongoose types
    const unknownUser: any = user;
    await unknownUser.posts.pull();

    // I want to delete the file only when I'm sure I successfully deleted the post
    deleteImage(imageUrl);
    res.status(200).json({
      message: 'Post deleted',
    });
  } catch (deleteError) {
    console.error({ deleteError });
    const error = new InternalServerError(
      'Something went wrong when trying to delete a post'
    );
    return next(error);
  }
};

export const getUserStatus: RequestHandler = async (
  req: RequestWithUserId,
  res,
  next
) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return next(new NotFound('user not found'));
    }
    res.status(200).json({ status: user.status });
  } catch (error) {
    next(new InternalServerError('Error while getting userStatus'));
  }
};

export const updateUserStatus: RequestHandler = async (
  req: RequestWithUserId,
  res,
  next
) => {
  const { newStatus } = req.body;
  const user = await User.findById(req.userId);
  if (!user) {
    return next(new NotFound('User not found'));
  }
  user.status = newStatus;
  await user.save();
  res.status(200).json({
    message: 'User updated',
  });
};
