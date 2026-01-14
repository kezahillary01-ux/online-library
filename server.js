const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const SECRET_KEY = 'your-secret-key'; // In production, use environment variable

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Load data
let users = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/users.json')));
let books = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/books.json')));

// Middleware to verify JWT
function verifyToken(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) return res.status(403).json({ message: 'No token provided' });

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) return res.status(500).json({ message: 'Failed to authenticate token' });
    req.userId = decoded.id;
    next();
  });
}

// Routes
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = {
    id: users.length + 1,
    username,
    password: hashedPassword,
    role: 'user',
    borrowedBooks: []
  };
  users.push(newUser);
  fs.writeFileSync(path.join(__dirname, '../data/users.json'), JSON.stringify(users, null, 2));
  res.status(201).json({ message: 'User registered successfully' });
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: user.id }, SECRET_KEY, { expiresIn: '1h' });
  res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
});

app.get('/books', (req, res) => {
  res.json(books);
});

app.post('/books/borrow/:id', verifyToken, (req, res) => {
  const bookId = parseInt(req.params.id);
  const book = books.find(b => b.id === bookId);
  if (!book || !book.available) {
    return res.status(400).json({ message: 'Book not available' });
  }
  const user = users.find(u => u.id === req.userId);
  book.available = false;
  book.borrowedBy = req.userId;
  user.borrowedBooks.push(bookId);
  fs.writeFileSync(path.join(__dirname, '../data/books.json'), JSON.stringify(books, null, 2));
  fs.writeFileSync(path.join(__dirname, '../data/users.json'), JSON.stringify(users, null, 2));
  res.json({ message: 'Book borrowed successfully' });
});

app.post('/books/return/:id', verifyToken, (req, res) => {
  const bookId = parseInt(req.params.id);
  const book = books.find(b => b.id === bookId);
  if (!book || book.borrowedBy !== req.userId) {
    return res.status(400).json({ message: 'Book not borrowed by you' });
  }
  const user = users.find(u => u.id === req.userId);
  book.available = true;
  book.borrowedBy = null;
  user.borrowedBooks = user.borrowedBooks.filter(id => id !== bookId);
  fs.writeFileSync(path.join(__dirname, '../data/books.json'), JSON.stringify(books, null, 2));
  fs.writeFileSync(path.join(__dirname, '../data/users.json'), JSON.stringify(users, null, 2));
  res.json({ message: 'Book returned successfully' });
});

// Admin routes
app.post('/books', verifyToken, (req, res) => {
  const user = users.find(u => u.id === req.userId);
  if (user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
  const { title, author, genre } = req.body;
  const newBook = {
    id: books.length + 1,
    title,
    author,
    genre,
    available: true,
    borrowedBy: null
  };
  books.push(newBook);
  fs.writeFileSync(path.join(__dirname, '../data/books.json'), JSON.stringify(books, null, 2));
  res.status(201).json(newBook);
});

app.put('/books/:id', verifyToken, (req, res) => {
  const user = users.find(u => u.id === req.userId);
  if (user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
  const bookId = parseInt(req.params.id);
  const book = books.find(b => b.id === bookId);
  if (!book) return res.status(404).json({ message: 'Book not found' });
  const { title, author, genre } = req.body;
  book.title = title || book.title;
  book.author = author || book.author;
  book.genre = genre || book.genre;
  fs.writeFileSync(path.join(__dirname, '../data/books.json'), JSON.stringify(books, null, 2));
  res.json(book);
});

app.delete('/books/:id', verifyToken, (req, res) => {
  const user = users.find(u => u.id === req.userId);
  if (user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
  const bookId = parseInt(req.params.id);
  books = books.filter(b => b.id !== bookId);
  fs.writeFileSync(path.join(__dirname, '../data/books.json'), JSON.stringify(books, null, 2));
  res.json({ message: 'Book deleted successfully' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
