// https://codepen.io/Abduboriy/pen/PwYrYvr?editors=1010
require('dotenv').config();
const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const { createHandler } = require('graphql-http/lib/use/express');
const graphqlResolver = require('./graphql/resolvers');
const graphqlSchema = require('./graphql/schema');

const { ruruHTML } = require('ruru/server');

const feedRoutes = require('./routes/feed.route');
const authRoutes = require('./routes/auth.route');

const app = express();

const fileStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'images');
  },
  filename: function (req, file, cb) {
    cb(null, uuidv4() + '-' + file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/jpeg'
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

const MONGODB_URI = process.env.MONGODB_URI.toString();

app.use(bodyParser.json()); // application/json
app.use(multer({ storage: fileStorage, fileFilter: fileFilter }).single('image'));
app.use('/images', express.static(path.join(__dirname, 'images')));

// Fixing CORS error
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000'); // second argument can be also other things like => codepen.io or *
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST, PUT, PATCH, DELETE'); // second argument can be also other things like => 'GET, POST, PUT, PUTCH'
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); // or second argument => * (everything)
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use('/feed', feedRoutes);
app.use('/auth', authRoutes);

app.use('/graphql', (req, res) =>
  createHandler({
    schema: graphqlSchema,
    rootValue: graphqlResolver,
    context: { req, res },
    formatError(err) {
      if (!err.originalError) {
        return err;
      }
      const data = err.originalError.data;
      const message = err.message || 'An error occurred';
      const code = err.originalError.code || 500;
      return { message, data, status: code };
    },
  })(req, res)
);

// Serve the GraphiQL IDE.
app.get('/ruru', (_req, res) => {
  res.type('html');
  res.end(ruruHTML({ endpoint: '/graphql' }));
});

app.use((error, req, res, next) => {
  console.log(error);
  const statusCode = error.statusCode || 500;
  const message = error.message;
  const data = error.data;
  res.status(statusCode).json({ message, data });
});

mongoose
  .connect(MONGODB_URI)
  .then((result) => {
    const server = app.listen(8080, () => console.log(`Server is running`));
  })
  .catch((err) => console.log(`Database connection failed: ${err}`));
