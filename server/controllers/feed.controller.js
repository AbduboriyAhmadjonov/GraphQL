const fs = require('fs');
const path = require('path');

const { validationResult } = require('express-validator');

const Post = require('../models/post.model');
const User = require('../models/user.model');

exports.getPosts = async (req, res, next) => {
  const currentPage = req.query.page || 1;
  const perPage = 2;
  try {
    const totalItems = await Post.find().countDocuments();
    const posts = await Post.find()
      .populate('creator')
      .sort({ createdAd: -1 })
      .skip((currentPage - 1) * perPage)
      .limit(perPage);

    res.status(200).json({ posts, totalItems });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.createPost = async (req, res, next) => {
  const error = validationResult(req);
  if (!error.isEmpty()) {
    const error = new Error('Validation failed, entered data is incorrect');
    error.statusCode = 422;
    throw error;
  }

  if (!req.file) {
    const error = new Error('No image provided');
    error.statusCode = 422;
    throw error;
  }

  const title = req.body.title;
  const content = req.body.content;
  const imageUrl = req.file.path.replace('\\', '/');

  const post = new Post({
    title: title,
    content: content,
    imageUrl: imageUrl,
    creator: req.userId,
  });

  try {
    await post.save();
    const user = await User.findById(req.userId);

    if (!user) {
      const error = new Error('No user was found');
      error.statusCode = 422;
      throw error;
    }

    user.posts.push(post);
    await user.save();
    // io.getIO().emit('posts', {
    //   action: 'create',
    //   post: post,
    // });

    res.status(201).json({
      message: 'Post created successfully!',
      post: post,
      creator: { _id: user._id, name: user.name },
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getPost = async (req, res, next) => {
  const postId = req.params.postId;

  try {
    const post = await Post.findById(postId);
    if (!post) {
      const error = new Error('Could not find post.');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({ message: 'Post fetched.', post: post });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.updatePost = async (req, res, next) => {
  const postId = req.params.postId;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed, entered data is incorrect.');
    error.statusCode = 422;
    throw error;
  }
  const title = req.body.title;
  const content = req.body.content;
  let imageUrl = req.body.image;
  if (req.file) {
    /** REPLACE ALL '\' WITH '/' */
    imageUrl = req.file.path.replace(/\\/g, '/');
  }
  if (!imageUrl) {
    const error = new Error('No file picked.');
    error.statusCode = 422;
    throw error;
  }
  try {
    const post = await Post.findById(postId).populate('creator');
    if (!post) {
      const error = new Error('Could not find post.');
      error.statusCode = 404;
      throw error;
    }
    if (post.creator._id.toString() !== req.userId) {
      const error = new Error('Not authorized.');
      error.statusCode = 403;
      throw error;
    }
    if (imageUrl !== 'undefined' && imageUrl !== post.imageUrl) {
      if (post.imageUrl !== 'undefined') {
        clearImage(post.imageUrl);
      }
      post.imageUrl = imageUrl;
    }
    post.title = title;
    post.content = content;
    const updatedPost = await post.save();

    // io.getIO().emit('posts', {
    //   action: 'update',
    //   post: {
    //     ...updatedPost._doc,
    //     creator: {
    //       _id: updatedPost.creator._id,
    //       name: updatedPost.creator.name,
    //       status: updatedPost.creator.status,
    //     },
    //   },
    // });
    res.status(200).json({ message: 'Post updated!', post: updatedPost });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.deletePost = async (req, res, next) => {
  const postId = req.params.postId;

  try {
    const post = await Post.findById(postId);
    if (!post) {
      const error = new Error('Could not find post.');
      error.statusCode = 404;
      throw error;
    }

    if (post.creator.toString() !== req.userId) {
      const error = new Error('Not authorized.');
      error.statusCode = 403;
      throw error;
    }

    clearImage(post.imageUrl);
    await Post.findByIdAndDelete(postId);
    const user = await User.findById(req.userId);
    user.posts.pull(postId);
    await user.save();

    // io.getIO().emit('posts', {
    //   action: 'delete',
    //   post: postId,
    // });
    res.status(200).json({ message: 'Deleted post.' });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error('Could not find a user.');
      error.statusCode = 404;
      throw error;
    }

    console.log(user.status);
    res.status(200).json({ status: user.status });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.updateStatus = async (req, res, next) => {
  const newStatus = req.body.status;

  try {
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error('Could not find a user.');
      error.statusCode = 404;
      throw error;
    }
    console.log(user.status);

    user.status = newStatus;
    await user.save();
    res.status(200).json({ message: 'Status updated successfully' });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

const clearImage = (filePath) => {
  filePath = path.join(__dirname, '..', filePath);
  fs.unlink(filePath, (err) => console.log(err));
};
