# Barangay Information System (BIS) - Setup Guide

This is a full-stack Barangay Information System with a React frontend and Node.js/Express backend.

## Prerequisites

Before running this application, make sure you have the following installed:

1. **Node.js** (v14 or higher) - [Download here](https://nodejs.org/)
2. **MySQL** or **MariaDB** - [Download MySQL](https://dev.mysql.com/downloads/) or [Download MariaDB](https://mariadb.org/download/)
3. **npm** (comes with Node.js) or **yarn**

## Setup Instructions

### Step 1: Database Setup

1. **Start your MySQL/MariaDB server**

2. **Create the database:**
   ```sql
   CREATE DATABASE barangay_db;
   ```

3. **Import the database schema:**
   - Open MySQL command line or phpMyAdmin
   - Select the `barangay_db` database
   - Import the `barangay_db.sql` file:
     ```bash
     mysql -u root -p barangay_db < barangay_db.sql
     ```
     Or use phpMyAdmin's import feature

### Step 2: Backend Setup

1. **Navigate to the backend directory:**
   ```bash
   cd barangay-system-backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create a `.env` file** in the `barangay-system-backend` directory:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=barangay_db
   PORT=5000
   JWT_SECRET=your_secret_key_here
   ```
   
   **Note:** Replace `your_mysql_password` with your actual MySQL root password (or leave empty if no password), and `your_secret_key_here` with a random secret string for JWT token signing.

4. **Start the backend server:**
   ```bash
   npm run dev
   ```
   
   The backend should now be running on `http://localhost:5000`

### Step 3: Frontend Setup

1. **Open a new terminal** and navigate to the frontend directory:
   ```bash
   cd barangay-system-frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the frontend development server:**
   ```bash
   npm run dev
   ```
   
   The frontend should now be running (typically on `http://localhost:5173`)

## Running the Application

1. **Make sure MySQL is running**

2. **Start the backend server** (in `barangay-system-backend` directory):
   ```bash
   npm run dev
   ```

3. **Start the frontend server** (in `barangay-system-frontend` directory, in a new terminal):
   ```bash
   npm run dev
   ```

4. **Open your browser** and navigate to the frontend URL (usually `http://localhost:5173`)

## Default Login Credentials

Based on the database, you can log in with:
- **Username:** `sanjose.dhani@gmail.com`
- **Password:** (Check the database or create a new user via registration)

## Project Structure

```
BISV2/
├── barangay_db.sql              # Database schema and initial data
├── barangay-system-backend/     # Node.js/Express API server
│   ├── server.js                # Main server file
│   ├── package.json
│   └── uploads/                 # Uploaded files (signatures)
└── barangay-system-frontend/    # React frontend application
    ├── src/
    │   ├── api.js              # API configuration
    │   ├── App.jsx             # Main app component
    │   └── pages/              # Page components
    └── package.json
```

## API Endpoints

The backend provides the following main endpoints:
- `/api/auth/login` - User login
- `/api/auth/register` - User registration
- `/api/residents` - Resident management
- `/api/households` - Household management
- `/api/incidents` - Incident management
- `/api/services` - Service management
- `/api/officials` - Official management
- `/api/barangay-profile` - Barangay profile settings

## Troubleshooting

1. **Database connection errors:**
   - Verify MySQL is running
   - Check your `.env` file has correct database credentials
   - Ensure the `barangay_db` database exists

2. **Port already in use:**
   - Change the `PORT` in the backend `.env` file
   - Update the `baseURL` in `frontend/src/api.js` to match

3. **Module not found errors:**
   - Run `npm install` in both backend and frontend directories

4. **CORS errors:**
   - Ensure the backend is running before starting the frontend
   - Check that the frontend is connecting to the correct backend URL

## Production Build

To create a production build of the frontend:

```bash
cd barangay-system-frontend
npm run build
```

The built files will be in the `dist` directory.
