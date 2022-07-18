import bcrypt from 'bcryptjs';
import jsonwebtoken from 'jsonwebtoken';
import { HydratedDocument } from 'mongoose';
import { default as validator } from 'validator';
import {
  InternalServerError,
  NotFound,
  RequestValidationError,
  Unauthorized,
} from '../errors/index.js';
import { AuthedRequest } from '../middleware/auth.js';
import { Post, PostModel, User } from '../models/index.js';
import { deleteImage } from '../utis/index.js';

const { sign } = jsonwebtoken;

const checkAuth = (request: AuthedRequest) => {
  if (!request.isAuth) {
    throw new Unauthorized('You are not authorized to perform this action');
  }
};

export const resolvers = {
  async createUser(
    //TODO: check types for resolvers in graphql
    args: any,
    req: any
  ) {
    const { email, name, password } = args.userInput;
    const errors = [];
    if (!validator.isEmail(email)) {
      errors.push({
        message: 'Email is invalid',
      });
    }
    if (!validator.isLength(password, { min: 5 })) {
      errors.push({
        message: 'Password should be at least 5 characters long',
      });
    }
    if (errors.length > 0) {
      const error = new RequestValidationError('Invalid input', errors);
      throw error;
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const error = new Error('User exists already');
      throw error;
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new User({
      email,
      name,
      password: hashedPassword,
    });
    //todo: mongoose does not recognise the _doc field
    const createdUser: any = await user.save();
    return {
      ...createdUser._doc,
      _id: createdUser._id.toString(),
    };
  },
  async login({ email, password }: { email: string; password: string }) {
    const errors = [];
    if (!validator.isEmail(email)) {
      errors.push({
        message: 'Email is invalid',
      });
    }
    if (!validator.isLength(password, { min: 5 })) {
      errors.push({
        message: 'Password should be at least 5 characters long',
      });
    }
    if (errors.length) {
      throw new RequestValidationError('Invalid data', errors);
    }
    const user = await User.findOne({ email });
    if (!user) {
      throw new NotFound('User not found');
    }
    const isPasswordValid = bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Unauthorized('Invalid credentials');
    }
    // generate a jwt, we sign an object payload with a secret key
    const jwt = sign(
      {
        email,
        userId: user._id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '1h',
      }
    );

    return {
      message: 'Successfully logged in',
      token: jwt,
      userId: user._id.toString(),
    };
  },
  async createPost(
    {
      postInput: { title, imageUrl, content },
    }: { postInput: { title: string; imageUrl: string; content: string } },
    req: AuthedRequest
  ) {
    checkAuth(req);
    const errors = [];
    if (!validator.isLength(title, { min: 5 })) {
      errors.push({ message: 'title is too short' });
    }
    if (!validator.isLength(content, { min: 5 })) {
      errors.push({ message: 'content is too short' });
    }
    if (errors.length) {
      throw new RequestValidationError('Invalid data', errors);
    }
    const user: any = await User.findById(req.userId);
    if (!user) {
      throw new InternalServerError('User was not found');
    }
    const post = new Post({
      title,
      content,
      imageUrl,
      creator: user._id,
    });

    const newPost: any = await post.save();
    user.posts.push(newPost);
    await user.save();

    const returnValue = {
      ...newPost._doc,
      _id: newPost._id.toString(),
      createdAt: newPost.createdAt.toISOString(),
      updatedAt: newPost.updatedAt.toISOString(),
      creator: { ...user._doc },
    };
    return returnValue;
  },
  async posts({ page }: { page: number }, req: AuthedRequest) {
    checkAuth(req);
    if (!page) {
      page = 1;
    }
    const perPage = 2;
    const totalPosts = await Post.countDocuments();
    const posts: HydratedDocument<PostModel>[] = await Post.find({
      creator: req.userId,
    })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .sort({ createdAt: -1 })
      .populate('creator');

    return {
      totalPosts,
      posts: posts.map((p) => ({
        ...p._doc,
        _id: p._id.toString(),
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
    };
  },
  async post({ id }: { id: string }, req: AuthedRequest) {
    checkAuth(req);
    const post = await Post.findById(id).populate('creator');
    if (!post) {
      throw new NotFound('Post not found with the given id');
    }
    return {
      ...post._doc,
      _id: post._id.toString(),
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    };
  },
  async deletePost({ id }: { id: string }, req: AuthedRequest) {
    checkAuth(req);
    const post = await Post.findById(id);
    if (!post) {
      throw new NotFound('Post not found');
    }
    if (post.creator.toString() !== req.userId.toString()) {
      throw new Unauthorized('You cannot delete posts that you do not own');
    }
    let user: any;
    try {
      user = await User.findById(post.creator);
    } catch (userError) {
      throw new InternalServerError('Failed to get user infomartion');
    }
    try {
      const imagePath = post.imageUrl;
      await post.remove();
      deleteImage(imagePath);
      user.posts.pull(id);
      await user.save();
    } catch {
      throw new InternalServerError('Error while trying to delete the post');
    }

    return 'Post deleted succesfully';
  },
  async updatePost(
    {
      id,
      postInput: { title, imageUrl, content },
    }: {
      id: string;
      postInput: { title: string; imageUrl: string; content: string };
    },
    req: AuthedRequest
  ) {
    checkAuth(req);
    const errors = [];
    if (!validator.isLength(title, { min: 5 })) {
      errors.push({ message: 'title is too short' });
    }
    if (!validator.isLength(content, { min: 5 })) {
      errors.push({ message: 'content is too short' });
    }
    if (errors.length) {
      throw new RequestValidationError('Invalid data', errors);
    }
    const post = await Post.findById(id).populate('creator');
    if (!post) {
      throw new NotFound('Post not found');
    }
    post.title = title;
    post.content = content;
    if (imageUrl !== 'undefined') post.imageUrl = imageUrl;

    const updatedPost = await post.save();

    return {
      ...updatedPost._doc,
      _id: updatedPost._id.toString(),
      createdAt: updatedPost.createdAt.toISOString(),
      updatedAt: updatedPost.updatedAt.toISOString(),
    };
  },
  async user(_: unknown, req: AuthedRequest) {
    checkAuth(req);
    const user = await User.findById(req.userId);
    if (!user) {
      throw new NotFound('User not found');
    }
    return { ...user._doc, _id: user._id.toString() };
  },
  async updateStatus({ status }: { status: string }, req: AuthedRequest) {
    checkAuth(req);
    if (!status) {
      throw new RequestValidationError('Error with request input', [
        { message: 'Status cannott be empty' },
      ]);
    }
    const user = await User.findById(req.userId);
    if (!user) {
      throw new NotFound('User not found');
    }
    user.status = status;
    await user.save();
    return { ...user._doc, _id: user._id.toString() };
  },
};
