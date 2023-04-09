const express = require('express');
const mysql = require('mysql');
const session = require('express-session');
const bcrypt = require('bcrypt');
const app = express();

app.use(express.static('public'));
app.use(express.urlencoded({extended:false}));

const connection = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: 'password',
  database: 'Mod'
});

app.use(
  session({
    secret: 'my_secret_key',
    resave: false,
    saveUninitialized: false,
  })
);

app.use((req, res, next) => {
  if (req.session.userId === undefined) {
    res.locals.username = 'guest';
    res.locals.isLoggedIn = false;
  } else {
    const username = req.session.username;
    res.locals.username = req.session.username;
    res.locals.isLoggedIn = true;
    const userId = req.session.id
  }
  next();
});

app.get('/test',(req,res)=>{
  res.render('test.ejs');
});

app.get('/',(req,res)=>{
  res.render('top.ejs');
});

app.get('/home', (req, res) => {
  connection.query(
    'SELECT * FROM posts ORDER BY id DESC LIMIT 100',
    (error, results) => {
      if(error) {
        console.log(error);
      } else {
        res.render('home.ejs', { posts: results });
      }
    }
  );
});


app.post('/post', (req,res) => {
  const postContent = req.body.postContent;
  const postTime = new Date();
  const id = 111;
  const errors = [];

  connection.query(
    'INSERT INTO posts (user_id, content, created_at) VALUES (?, ?, ?, ?)',
    [id, postContent, postTime],
    (error, results) => {
      if (error) {
        errors.push('投稿に失敗しました');
        res.render('home.ejs', { errors: errors });
      } else {
        res.redirect('/home');
      }
    }
  );
  
})

app.get('/projects/:id', (req, res) => {
  const id = req.params.id;
  connection.query(
    'SELECT * FROM projects WHERE id = ?',
    [id],
    (error, results) => {
      res.render('project.ejs', { projects: results[0] });
    }
  );
});

app.get('/index', (req, res) => {
  res.render('index.ejs');
});

app.get('/signup', (req, res) => {
  res.render('signup.ejs', { errors: [] });
});

app.post('/signup', 
  (req, res, next) => {
    console.log('入力値の空チェック');
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;
    const errors = [];

    if (username === '') {
      errors.push('ユーザー名が空です');
    }

    if (email === '') {
      errors.push('メールアドレスが空です');
    }

    if (password === '') {
      errors.push('パスワードが空です');
    }

    if (errors.length > 0) {
      res.render('signup.ejs', { errors: errors });
    } else {
      next();
    }
  },
  (req, res, next) => {
    console.log('メールアドレスの重複チェック');
    const email = req.body.email;
    const errors = [];
    connection.query(
      'SELECT * FROM users WHERE email = ?',
      [email],
      (error, results) => {
        if (error) {
          console.error('エラーが発生しました:', error);
          return res.status(500).send('内部エラーが発生しました');
        }
        if (results && results.length > 0) {
          errors.push('ユーザー登録に失敗しました');
          res.render('signup.ejs', { errors: errors });
        } else {
          next();
        }
      }
    );
  },
  (req, res) => {
    console.log('ユーザー登録');
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;
    bcrypt.hash(password, 10, (error, hash) => {
      connection.query(
        'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
        [username, email, hash],
        (error, results) => {
          req.session.userId = results.insertId;
          req.session.username = username;
          res.redirect('/home');
        }
      );
    });
  }
);

app.get('/login', (req, res) => {
  res.render('login.ejs');
});

app.post('/login', (req, res) => {
  const email = req.body.email;
  connection.query(
    'SELECT * FROM users WHERE email = ?',
    [email],
    (error, results) => {
      if (results.length > 0) {
        const plain = req.body.password;
        const hash = results[0].password;
        bcrypt.compare(plain, hash, (error, isEqual) => {
          if(isEqual){
            req.session.userId = results[0].id;
            req.session.username = results[0].username;
            res.redirect('/home');
          } else {
            res.redirect('/login');
          }
        })
      } else {
        res.redirect('/login');
      }
    }
  );
});

app.get('/logout', (req, res) => {
  req.session.destroy((error) => {
    res.redirect('/list');
  })
})

app.listen(3000);
