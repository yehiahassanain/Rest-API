const path = require('path');
const fs = require('fs');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const multer = require('multer');
const  { graphqlHTTP } = require('express-graphql');
const auth = require('./meddleware/auth');
const { clearImage } = require('./util/file');

const graphqlSchema = require('./graphql/schema');
const graphqlResolver = require('./graphql/resolver');

const app = express();

const { v4: uuidv4 } = require('uuid');
const { Socket } = require('socket.io');
 
const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'images');
    },
    filename: (req, file, cb) => {
        cb(null, uuidv4() + '-' + file.originalname);
    }
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

// app.use(bodyParser.urlencoded()); // x-www-form-urlencoded <form>
app.use(bodyParser.json()); // application/json
app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).single('image')
);
app.use('/images', express.static(path.join(__dirname, 'images')));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'OPTIONS, GET, POST, PUT, PATCH, DELETE'
  );
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
}
  next();
});

app.use(auth);

app.put('/post-image',(req,res,next)=>{
  if (!req.isAuth){
    throw new Error('Not authientication')
  }
  if (!req.file){
    return res.status(200).json({message: 'Not file provided!'});
  }
  if (req.body.oldPath){
    clearImage(req.body.oldPath);
  }
  return res.status(201).json({message: 'File stored.', filePath: req.file.path});
});


app.use(
  '/graphql',
  graphqlHTTP({
    schema: graphqlSchema,
    rootValue: graphqlResolver,
    graphiql: true,
    formatError(err){
      if(!err.originalError){
        return err;
      }
      const data = err.originalError.data;
      const message = err.message || 'An error occured.';
      const code = err.originalError.code ||500;
      return { message: message, status: code, data: data}
    }
  })
)

app.use((error, req, res, next) => {
  console.log(error);
  const status = error.statusCode || 500;
  const message = error.message;
  const data = error.data;
  res.status(status).json({ message: message, data:data });
});

mongoose
  .connect( 'mongodb+srv://yehiahassanain:efoszQPFvYVZGA8o@cluster0.j3razmw.mongodb.net/messages' ) 
    .then(result => { 
    app.listen(8080);
  })
    .catch(err => console.log(err));

