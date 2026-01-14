const API_URL = 'http://localhost:3000';

let currentUser = JSON.parse(localStorage.getItem('user'));
let token = localStorage.getItem('token');

document.addEventListener('DOMContentLoaded', () => {
    if (token) {
        showBooksPage();
        fetchBooks();
    } else {
        showLoginPage();
    }
    setupEventListeners();
});

function setupEventListeners() {
    // Login form
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    
    // Register form
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    
    // Add book form (admin)
    document.getElementById('add-book-form').addEventListener('submit', handleAddBook);
    
    // Logout
    document.getElementById('logout-btn').addEventListener('click', logout);
    
    // Navigation
    document.getElementById('show-register').addEventListener('click', showRegisterPage);
    document.getElementById('show-login').addEventListener('click', showLoginPage);
}

function showLoginPage() {
    hideAllPages();
    document.getElementById('login-page').style.display = 'block';
}

function showRegisterPage() {
    hideAllPages();
    document.getElementById('register-page').style.display = 'block';
}

function showBooksPage() {
    hideAllPages();
    document.getElementById('books-page').style.display = 'block';
    document.getElementById('logout-btn').style.display = 'inline-block';
    if (currentUser && currentUser.role === 'admin') {
        document.getElementById('admin-page').style.display = 'block';
    }
}

function hideAllPages() {
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('register-page').style.display = 'none';
    document.getElementById('books-page').style.display = 'none';
    document.getElementById('admin-page').style.display = 'none';
    document.getElementById('logout-btn').style.display = 'none';
}

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            token = data.token;
            currentUser = data.user;
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(currentUser));
            showBooksPage();
            fetchBooks();
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('An error occurred during login.');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('register-username').value;
    const password = document.getElementById('register-password').value;
    
    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Registration successful! Please login.');
            showLoginPage();
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Registration error:', error);
        alert('An error occurred during registration.');
    }
}

async function fetchBooks() {
    try {
        const response = await fetch(`${API_URL}/books`);
        const books = await response.json();
        displayBooks(books);
    } catch (error) {
        console.error('Error fetching books:', error);
    }
}

function displayBooks(books) {
    const bookList = document.getElementById('book-list');
    const adminBookList = document.getElementById('admin-book-list');
    bookList.innerHTML = '';
    adminBookList.innerHTML = '';
    
    books.forEach(book => {
        const bookCard = createBookCard(book);
        bookList.appendChild(bookCard.cloneNode(true));
        adminBookList.appendChild(bookCard);
    });
}

function createBookCard(book) {
    const card = document.createElement('div');
    card.className = 'book-card';
    card.innerHTML = `
        <h3>${book.title}</h3>
        <p>Author: ${book.author}</p>
        <p>Genre: ${book.genre}</p>
        <p>Status: ${book.available ? 'Available' : 'Borrowed'}</p>
    `;
    
    if (book.available) {
        const borrowBtn = document.createElement('button');
        borrowBtn.textContent = 'Borrow';
        borrowBtn.addEventListener('click', () => borrowBook(book.id));
        card.appendChild(borrowBtn);
    } else if (book.borrowedBy === currentUser?.id) {
        const returnBtn = document.createElement('button');
        returnBtn.textContent = 'Return';
        returnBtn.addEventListener('click', () => returnBook(book.id));
        card.appendChild(returnBtn);
    }
    
    if (currentUser?.role === 'admin') {
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.style.backgroundColor = '#f44336';
        deleteBtn.addEventListener('click', () => deleteBook(book.id));
        card.appendChild(deleteBtn);
    }
    
    return card;
}

async function borrowBook(bookId) {
    try {
        const response = await fetch(`${API_URL}/books/borrow/${bookId}`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': token
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Book borrowed successfully!');
            fetchBooks();
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Error borrowing book:', error);
        alert('An error occurred while borrowing the book.');
    }
}

async function returnBook(bookId) {
    try {
        const response = await fetch(`${API_URL}/books/return/${bookId}`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': token
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Book returned successfully!');
            fetchBooks();
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Error returning book:', error);
        alert('An error occurred while returning the book.');
    }
}

async function handleAddBook(e) {
    e.preventDefault();
    const title = document.getElementById('book-title').value;
    const author = document.getElementById('book-author').value;
    const genre = document.getElementById('book-genre').value;
    
    try {
        const response = await fetch(`${API_URL}/books`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': token
            },
            body: JSON.stringify({ title, author, genre })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Book added successfully!');
            document.getElementById('add-book-form').reset();
            fetchBooks();
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Error adding book:', error);
        alert('An error occurred while adding the book.');
    }
}

async function deleteBook(bookId) {
    if (!confirm('Are you sure you want to delete this book?')) return;
    
    try {
        const response = await fetch(`${API_URL}/books/${bookId}`, {
            method: 'DELETE',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': token
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Book deleted successfully!');
            fetchBooks();
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Error deleting book:', error);
        alert('An error occurred while deleting the book.');
    }
}

function logout() {
    token = null;
    currentUser = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    showLoginPage();
}

