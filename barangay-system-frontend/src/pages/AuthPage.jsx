// src/pages/AuthPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Grid,
  Tabs,
  Tab,
  MenuItem,
  IconButton,
  InputAdornment,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Visibility, VisibilityOff, ErrorOutline, CheckCircle, Warning, Info } from '@mui/icons-material';
import api from '../api';
import barangayLogo from '../assets/barangay-logo.svg';

const AuthPage = ({ onLogin }) => {
  const isProcessingRef = useRef(false); // Synchronous lock to prevent multiple submissions
  const [isProcessing, setIsProcessing] = useState(false); // State for button disabled
  const [tab, setTab] = useState(0); // 0 = Login, 1 = Register
  const [logo, setLogo] = useState(() => {
    const savedLogo = localStorage.getItem('barangayLogo');
    return savedLogo || barangayLogo;
  });

  // Listen for logo changes
  useEffect(() => {
    const handleStorageChange = () => {
      const savedLogo = localStorage.getItem('barangayLogo');
      setLogo(savedLogo || barangayLogo);
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Check periodically for same-tab updates
    const interval = setInterval(() => {
      const savedLogo = localStorage.getItem('barangayLogo');
      const currentLogo = savedLogo || barangayLogo;
      if (currentLogo !== logo) {
        setLogo(currentLogo);
      }
    }, 500);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [logo]);

  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    username: '',
    password: '',
    full_name: '',
    role: 'Staff',
  });

  const [loadingLogin, setLoadingLogin] = useState(false);
  const [loadingRegister, setLoadingRegister] = useState(false);
  const [errorLogin, setErrorLogin] = useState('');
  const [errorRegister, setErrorRegister] = useState('');
  const [successRegister, setSuccessRegister] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'error', // 'error' | 'success' | 'warning' | 'info'
  });
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorDialogMessage, setErrorDialogMessage] = useState('');
  const [errorDialogTitle, setErrorDialogTitle] = useState('Login Failed');
  const [errorDialogType, setErrorDialogType] = useState('error'); // 'error' | 'warning' | 'info'
  const hasShownErrorRef = useRef(false); // Track if we've already shown error for current attempt

  // Debug: Monitor snackbar state changes
  useEffect(() => {
    if (snackbar.open || snackbar.message) {
      console.log('Snackbar state changed:', snackbar);
    }
  }, [snackbar]);

  // Debug: Monitor dialog state changes
  useEffect(() => {
    if (errorDialogOpen || errorDialogMessage) {
      console.log('Dialog state changed - open:', errorDialogOpen, 'message:', errorDialogMessage, 'title:', errorDialogTitle, 'type:', errorDialogType);
    }
  }, [errorDialogOpen, errorDialogMessage, errorDialogTitle, errorDialogType]);

  const handleTabChange = (e, newValue) => {
    setTab(newValue);
    setErrorLogin('');
    setErrorRegister('');
    setSuccessRegister('');
  };

  const handleLoginChange = (e) => {
    const { name, value } = e.target;
    setLoginForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleRegisterChange = (e) => {
    const { name, value } = e.target;
    setRegisterForm((prev) => ({ ...prev, [name]: value }));
  };

  const normalizeError = (err, fallback) => {
    // If backend returned JSON with message, use that
    const msgFromServer = err?.response?.data?.message;
    console.log('Error message from server:', msgFromServer);
    
    // Check for authentication/credential errors
    const statusCode = err?.response?.status;
    const lowerMsg = msgFromServer?.toLowerCase() || '';
    
    // For 401 (Unauthorized) or any invalid credential message
    if (statusCode === 401 || 
        lowerMsg.includes('invalid') || 
        lowerMsg.includes('username') || 
        lowerMsg.includes('password') ||
        lowerMsg.includes('incorrect') ||
        lowerMsg.includes('wrong') ||
        lowerMsg.includes('unauthorized')) {
      return 'Incorrect email or password. Please try again.';
    }
    
    if (msgFromServer) {
      return msgFromServer;
    }

    // If backend returned HTML (e.g. Cannot POST /something)
    const raw = err?.response?.data;
    if (typeof raw === 'string' && raw.includes('Cannot POST')) {
      return 'API route not found. Check that server.js has /api/auth/... routes and is running on port 5000.';
    }

    // Network errors
    if (err?.code === 'ERR_NETWORK' || err?.message?.includes('Network Error')) {
      return 'Unable to connect to server. Please check your connection and try again.';
    }

    return fallback;
  };

  const showNotification = (message, severity = 'error') => {
    console.log('Showing notification:', message, severity);
    const errorMsg = message || 'An error occurred';
    
    // Set notification state directly
    setSnackbar({
      open: true,
      message: errorMsg,
      severity: severity || 'error',
    });
    
    // Also show dialog popup for login errors to ensure visibility
    // Only show if dialog is not already open to prevent multiple popups
    if (severity === 'error' && !errorDialogOpen) {
      setErrorDialogMessage(errorMsg);
      setErrorDialogOpen(true);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // CRITICAL: Synchronous check FIRST - before ANY async operations
    // This prevents multiple calls from getting through
    if (isProcessingRef.current || loadingLogin || isProcessing) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    
    // Set processing flag IMMEDIATELY (synchronous)
    isProcessingRef.current = true;
    setIsProcessing(true);
    
    // Reset error flag for new attempt
    hasShownErrorRef.current = false;
    setErrorLogin('');
    
    // DON'T reset dialog/snackbar here - let them be set by the conditions below
    // Only reset if we're starting a completely fresh attempt
    
    const username = loginForm.username.trim();
    const password = loginForm.password.trim();
    
    // Condition 1: No Credentials Entered (both empty)
    if (!username && !password) {
      // Prevent showing dialog if already processing or dialog already open
      if (errorDialogOpen || hasShownErrorRef.current) {
        isProcessingRef.current = false;
        return;
      }
      
      const errorMsg = 'Please enter your username and password to continue.';
      const dialogTitle = 'Login Failed';
      
      console.log('Condition 1 triggered - No credentials');
      
      // Use functional updates to ensure state is set correctly
      setErrorLogin(errorMsg);
      setErrorDialogTitle(dialogTitle);
      setErrorDialogMessage(errorMsg);
      setErrorDialogType('info');
      hasShownErrorRef.current = true;
      
      // Open dialog immediately - no delay needed
      setErrorDialogOpen(true);
      console.log('Dialog opened - state should be true');
      
      // Don't show snackbar for fullscreen dialog - dialog is the main notification
      // setSnackbar({
      //   open: true,
      //   message: errorMsg,
      //   severity: 'info',
      // });
      console.log('Dialog is the main notification - snackbar disabled');
      
      // Reset processing flag after a delay to prevent rapid double-clicks
      setTimeout(() => {
        isProcessingRef.current = false;
        setIsProcessing(false);
      }, 500);
      return;
    }
    
    // Condition 2: Missing Username or Password (one is empty)
    if (!username || !password) {
      // Prevent showing dialog if already processing or dialog already open
      if (errorDialogOpen || hasShownErrorRef.current) {
        isProcessingRef.current = false;
        return;
      }
      
      const errorMsg = 'Username or password cannot be empty. Please complete all required fields.';
      const dialogTitle = 'Incomplete Credentials';
      
      console.log('Condition 2 triggered - Incomplete credentials');
      
      // Set all states
      setErrorLogin(errorMsg);
      setErrorDialogTitle(dialogTitle);
      setErrorDialogMessage(errorMsg);
      setErrorDialogType('warning');
      hasShownErrorRef.current = true;
      
      // Open dialog immediately - no delay needed
      setErrorDialogOpen(true);
      console.log('Dialog opened - state should be true');
      
      // Don't show snackbar for fullscreen dialog - dialog is the main notification
      // setSnackbar({
      //   open: true,
      //   message: errorMsg,
      //   severity: 'warning',
      // });
      console.log('Dialog is the main notification - snackbar disabled');
      
      // Reset processing flag after a delay to prevent rapid double-clicks
      setTimeout(() => {
        isProcessingRef.current = false;
        setIsProcessing(false);
      }, 500);
      return;
    }

    // Set loading state - this disables button
    setLoadingLogin(true);

    try {
      // baseURL: http://localhost:5000/api + /auth/login = /api/auth/login
      const res = await api.post('/auth/login', loginForm);
      
      // Close any error dialog on successful login
      setErrorDialogOpen(false);
      hasShownErrorRef.current = false;
      onLogin({ token: res.data.token, user: res.data.user });
    } catch (err) {
      console.error('Login error:', err);
      // Condition 3: Wrong Username or Password
      const errorMsg = 'The username or password you entered is incorrect. Please try again.';
      const dialogTitle = 'Invalid Login';
      
      console.log('Condition 3 triggered - Wrong credentials');
      
      // CRITICAL: Only show dialog ONCE - use ref for immediate synchronous check
      // Also check if dialog is already open to prevent double-click issues
      if (!hasShownErrorRef.current && !errorDialogOpen) {
        hasShownErrorRef.current = true; // Block immediately
        
        // Set all states
        setErrorLogin(errorMsg);
        setErrorDialogTitle(dialogTitle);
        setErrorDialogMessage(errorMsg);
        setErrorDialogType('error');
        
        // Open dialog immediately - no delay needed
        setErrorDialogOpen(true);
        console.log('Dialog opened - state should be true');
        
        // Don't show snackbar for fullscreen dialog - dialog is the main notification
        // setSnackbar({
        //   open: true,
        //   message: errorMsg,
        //   severity: 'error',
        // });
        console.log('Dialog is the main notification - snackbar disabled');
      }
    } finally {
      setLoadingLogin(false);
      // Reset processing flag after a brief delay
      setTimeout(() => {
        isProcessingRef.current = false;
        setIsProcessing(false);
      }, 200);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorRegister('');
    setSuccessRegister('');

    // Validate empty fields
    if (!registerForm.full_name.trim() || !registerForm.username.trim() || !registerForm.password.trim()) {
      const errorMsg = 'Please fill in all required fields.';
      setErrorRegister(errorMsg);
      showNotification(errorMsg, 'warning');
      return;
    }

    try {
      setLoadingRegister(true);
      // baseURL: http://localhost:5000/api + /auth/register = /api/auth/register
      await api.post('/auth/register', registerForm);
      const successMsg = 'User registered successfully. You can now log in.';
      setSuccessRegister(successMsg);
      showNotification(successMsg, 'success');
      // Auto switch to login tab with username prefilled
      setTab(0);
      setLoginForm({
        username: registerForm.username,
        password: '',
      });
      setRegisterForm({
        username: '',
        password: '',
        full_name: '',
        role: 'Staff',
      });
    } catch (err) {
      console.error('Register error:', err);
      const errorMsg = normalizeError(err, 'Registration failed. Please try again.');
      setErrorRegister(errorMsg);
      showNotification(errorMsg, 'error');
    } finally {
      setLoadingRegister(false);
    }
  };


  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#F5F5F5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 50%, #F5F5F5 100%)',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(90deg, #2E7D32 0%, #4CAF50 100%)',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: '200px',
          height: '200px',
          background: 'radial-gradient(circle, rgba(46, 125, 50, 0.1) 0%, transparent 70%)',
          borderRadius: '50%',
        },
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: '450px',
          px: 2,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Paper 
          sx={{ 
            p: 5,
            borderRadius: 4,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)',
            background: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.8)',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1)',
            },
          }} 
          elevation={0}
        >
          <Box 
            sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              mb: 3,
              animation: 'fadeInDown 0.6s ease',
            }}
          >
            <Box
              sx={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(46, 125, 50, 0.25)',
                padding: '10px',
                border: '3px solid #2E7D32',
              }}
            >
              <img 
                src={logo} 
                alt="Barangay 636 Logo" 
                style={{ 
                  height: '100%', 
                  width: '100%',
                  objectFit: 'contain',
                }} 
              />
            </Box>
          </Box>
          <Typography 
            variant="h5" 
            gutterBottom 
            align="center"
            sx={{
              color: '#2E7D32',
              fontWeight: 800,
              mb: 3,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              lineHeight: 1.3,
            }}
          >
            BARANGAY 636 ZONE 64,
            <br />
            SANTA MESA MANILA
          </Typography>

          <Tabs
            value={tab}
            onChange={handleTabChange}
            centered
            sx={{ 
              mb: 4,
              '& .MuiTab-root': {
                color: '#757575',
                fontWeight: 600,
                fontSize: '1rem',
                textTransform: 'none',
                minHeight: '48px',
                transition: 'all 0.3s ease',
                '&:hover': {
                  color: '#2E7D32',
                },
              },
              '& .Mui-selected': {
                color: '#2E7D32',
                fontWeight: 700,
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#2E7D32',
                height: '3px',
                borderRadius: '3px 3px 0 0',
              },
            }}
          >
            <Tab label="Login" />
            <Tab label="Register" />
          </Tabs>

            {tab === 0 && (
              <Box 
                component="form" 
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleLoginSubmit(e);
                  return false;
                }}
                sx={{
                  animation: 'fadeIn 0.4s ease',
                }}
              >
                <TextField
                  margin="normal"
                  label="Username"
                  name="username"
                  value={loginForm.username}
                  onChange={handleLoginChange}
                  fullWidth
                  required
                  autoComplete="username"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      backgroundColor: '#FAFAFA',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        backgroundColor: '#F5F5F5',
                      },
                      '&.Mui-focused': {
                        backgroundColor: '#FFFFFF',
                        boxShadow: '0 0 0 3px rgba(46, 125, 50, 0.1)',
                      },
                      '& fieldset': {
                        borderColor: '#E0E0E0',
                        borderWidth: '1.5px',
                      },
                      '&:hover fieldset': {
                        borderColor: '#BDBDBD',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#2E7D32',
                        borderWidth: '2px',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      fontWeight: 500,
                      '&.Mui-focused': {
                        color: '#2E7D32',
                        fontWeight: 600,
                      },
                    },
                  }}
                />
                <TextField
                  margin="normal"
                  label="Password"
                  name="password"
                  type={showLoginPassword ? 'text' : 'password'}
                  value={loginForm.password}
                  onChange={handleLoginChange}
                  fullWidth
                  required
                  autoComplete="current-password"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                          edge="end"
                          sx={{
                            color: '#757575',
                            '&:hover': {
                              color: '#2E7D32',
                            },
                          }}
                        >
                          {showLoginPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      backgroundColor: '#FAFAFA',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        backgroundColor: '#F5F5F5',
                      },
                      '&.Mui-focused': {
                        backgroundColor: '#FFFFFF',
                        boxShadow: '0 0 0 3px rgba(46, 125, 50, 0.1)',
                      },
                      '& fieldset': {
                        borderColor: '#E0E0E0',
                        borderWidth: '1.5px',
                      },
                      '&:hover fieldset': {
                        borderColor: '#BDBDBD',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#2E7D32',
                        borderWidth: '2px',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      fontWeight: 500,
                      '&.Mui-focused': {
                        color: '#2E7D32',
                        fontWeight: 600,
                      },
                    },
                  }}
                />
                {errorLogin && (
                  <Typography 
                    color="error" 
                    variant="body2" 
                    sx={{ 
                      mt: 2,
                      p: 1.5,
                      borderRadius: 2,
                      backgroundColor: '#FFEBEE',
                      border: '1px solid #FFCDD2',
                    }}
                  >
                    {errorLogin}
                  </Typography>
                )}
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={loadingLogin || isProcessing}
                  sx={{ 
                    mt: 3,
                    mb: 2,
                    background: 'linear-gradient(135deg, #2E7D32 0%, #4CAF50 100%)',
                    '&:hover': {
                      background: loadingLogin ? 'linear-gradient(135deg, #2E7D32 0%, #4CAF50 100%)' : 'linear-gradient(135deg, #1B5E20 0%, #2E7D32 100%)',
                      transform: loadingLogin ? 'none' : 'translateY(-2px)',
                      boxShadow: loadingLogin ? '0 4px 12px rgba(46, 125, 50, 0.3)' : '0 6px 20px rgba(46, 125, 50, 0.4)',
                    },
                    py: 1.75,
                    fontWeight: 700,
                    fontSize: '1rem',
                    textTransform: 'none',
                    borderRadius: 2,
                    boxShadow: '0 4px 12px rgba(46, 125, 50, 0.3)',
                    transition: 'all 0.3s ease',
                    '&:active': {
                      transform: 'translateY(0)',
                    },
                    '&.Mui-disabled': {
                      opacity: 0.6,
                      cursor: 'not-allowed',
                    },
                  }}
                >
                  {loadingLogin ? 'Logging in...' : 'Login'}
                </Button>
              </Box>
            )}

            {tab === 1 && (
              <Box 
                component="form" 
                onSubmit={handleRegisterSubmit}
                sx={{
                  animation: 'fadeIn 0.4s ease',
                }}
              >
                <TextField
                  margin="normal"
                  label="Full Name"
                  name="full_name"
                  value={registerForm.full_name}
                  onChange={handleRegisterChange}
                  fullWidth
                  required
                  autoComplete="name"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      backgroundColor: '#FAFAFA',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        backgroundColor: '#F5F5F5',
                      },
                      '&.Mui-focused': {
                        backgroundColor: '#FFFFFF',
                        boxShadow: '0 0 0 3px rgba(46, 125, 50, 0.1)',
                      },
                      '& fieldset': {
                        borderColor: '#E0E0E0',
                        borderWidth: '1.5px',
                      },
                      '&:hover fieldset': {
                        borderColor: '#BDBDBD',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#2E7D32',
                        borderWidth: '2px',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      fontWeight: 500,
                      '&.Mui-focused': {
                        color: '#2E7D32',
                        fontWeight: 600,
                      },
                    },
                  }}
                />
                <TextField
                  margin="normal"
                  label="Username"
                  name="username"
                  value={registerForm.username}
                  onChange={handleRegisterChange}
                  fullWidth
                  required
                  autoComplete="username"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      backgroundColor: '#FAFAFA',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        backgroundColor: '#F5F5F5',
                      },
                      '&.Mui-focused': {
                        backgroundColor: '#FFFFFF',
                        boxShadow: '0 0 0 3px rgba(46, 125, 50, 0.1)',
                      },
                      '& fieldset': {
                        borderColor: '#E0E0E0',
                        borderWidth: '1.5px',
                      },
                      '&:hover fieldset': {
                        borderColor: '#BDBDBD',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#2E7D32',
                        borderWidth: '2px',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      fontWeight: 500,
                      '&.Mui-focused': {
                        color: '#2E7D32',
                        fontWeight: 600,
                      },
                    },
                  }}
                />
                <TextField
                  margin="normal"
                  label="Password"
                  name="password"
                  type={showRegisterPassword ? 'text' : 'password'}
                  value={registerForm.password}
                  onChange={handleRegisterChange}
                  fullWidth
                  required
                  autoComplete="new-password"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                          edge="end"
                          sx={{
                            color: '#757575',
                            '&:hover': {
                              color: '#2E7D32',
                            },
                          }}
                        >
                          {showRegisterPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      backgroundColor: '#FAFAFA',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        backgroundColor: '#F5F5F5',
                      },
                      '&.Mui-focused': {
                        backgroundColor: '#FFFFFF',
                        boxShadow: '0 0 0 3px rgba(46, 125, 50, 0.1)',
                      },
                      '& fieldset': {
                        borderColor: '#E0E0E0',
                        borderWidth: '1.5px',
                      },
                      '&:hover fieldset': {
                        borderColor: '#BDBDBD',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#2E7D32',
                        borderWidth: '2px',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      fontWeight: 500,
                      '&.Mui-focused': {
                        color: '#2E7D32',
                        fontWeight: 600,
                      },
                    },
                  }}
                />
                <TextField
                  select
                  margin="normal"
                  label="Role"
                  name="role"
                  value={registerForm.role}
                  onChange={handleRegisterChange}
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      backgroundColor: '#FAFAFA',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        backgroundColor: '#F5F5F5',
                      },
                      '&.Mui-focused': {
                        backgroundColor: '#FFFFFF',
                        boxShadow: '0 0 0 3px rgba(46, 125, 50, 0.1)',
                      },
                      '& fieldset': {
                        borderColor: '#E0E0E0',
                        borderWidth: '1.5px',
                      },
                      '&:hover fieldset': {
                        borderColor: '#BDBDBD',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#2E7D32',
                        borderWidth: '2px',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      fontWeight: 500,
                      '&.Mui-focused': {
                        color: '#2E7D32',
                        fontWeight: 600,
                      },
                    },
                  }}
                >
                  <MenuItem value="Admin">Admin</MenuItem>
                  <MenuItem value="Staff">Staff</MenuItem>
                </TextField>

                {errorRegister && (
                  <Typography 
                    color="error" 
                    variant="body2" 
                    sx={{ 
                      mt: 2,
                      p: 1.5,
                      borderRadius: 2,
                      backgroundColor: '#FFEBEE',
                      border: '1px solid #FFCDD2',
                    }}
                  >
                    {errorRegister}
                  </Typography>
                )}
                {successRegister && (
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      mt: 2,
                      p: 1.5,
                      borderRadius: 2,
                      backgroundColor: '#E8F5E9',
                      border: '1px solid #C8E6C9',
                      color: '#2E7D32',
                      fontWeight: 500,
                    }}
                  >
                    {successRegister}
                  </Typography>
                )}

                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  sx={{ 
                    mt: 3,
                    mb: 2,
                    background: 'linear-gradient(135deg, #2E7D32 0%, #4CAF50 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #1B5E20 0%, #2E7D32 100%)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 6px 20px rgba(46, 125, 50, 0.4)',
                    },
                    py: 1.75,
                    fontWeight: 700,
                    fontSize: '1rem',
                    textTransform: 'none',
                    borderRadius: 2,
                    boxShadow: '0 4px 12px rgba(46, 125, 50, 0.3)',
                    transition: 'all 0.3s ease',
                    '&:active': {
                      transform: 'translateY(0)',
                    },
                  }}
                  disabled={loadingRegister}
                >
                  {loadingRegister ? 'Registering...' : 'Register'}
                </Button>
              </Box>
            )}
          </Paper>
        </Box>
        <Snackbar
          open={snackbar.open}
          autoHideDuration={null}
          onClose={handleCloseSnackbar}
          disableAutoHide={true}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          sx={{
            zIndex: 99999,
            top: '24px !important',
          }}
        >
          <Alert
            onClose={handleCloseSnackbar}
            severity={snackbar.severity}
            variant="filled"
            icon={
              snackbar.severity === 'error' ? <ErrorOutline /> :
              snackbar.severity === 'warning' ? <Warning /> :
              snackbar.severity === 'info' ? <Info /> :
              <CheckCircle />
            }
            sx={{
              width: '100%',
              minWidth: '400px',
              maxWidth: '700px',
              fontSize: '1.1rem',
              fontWeight: 700,
              borderRadius: '12px',
              padding: '16px 20px',
              boxShadow: snackbar.severity === 'error' 
                ? '0 12px 40px rgba(211, 47, 47, 0.5)' 
                : snackbar.severity === 'success'
                ? '0 12px 40px rgba(46, 125, 50, 0.5)'
                : snackbar.severity === 'warning'
                ? '0 12px 40px rgba(237, 108, 2, 0.5)'
                : '0 12px 40px rgba(25, 118, 210, 0.5)',
              animation: 'slideDown 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
              '@keyframes slideDown': {
                from: {
                  transform: 'translateY(-120%) scale(0.9)',
                  opacity: 0,
                },
                to: {
                  transform: 'translateY(0) scale(1)',
                  opacity: 1,
                },
              },
              '& .MuiAlert-icon': {
                fontSize: '1.5rem',
                marginRight: '12px',
              },
              '& .MuiAlert-message': {
                display: 'flex',
                alignItems: 'center',
                padding: '4px 0',
                fontSize: '1.1rem',
                letterSpacing: '0.3px',
                lineHeight: '1.5',
              },
              '& .MuiAlert-action': {
                paddingTop: '4px',
                '& .MuiIconButton-root': {
                  color: 'rgba(255, 255, 255, 0.9)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    color: 'rgba(255, 255, 255, 1)',
                  },
                },
              },
              // Error styling
              ...(snackbar.severity === 'error' && {
                background: 'linear-gradient(135deg, #d32f2f 0%, #c62828 100%)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }),
              // Success styling
              ...(snackbar.severity === 'success' && {
                background: 'linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }),
              // Warning styling
              ...(snackbar.severity === 'warning' && {
                background: 'linear-gradient(135deg, #ed6c02 0%, #e65100 100%)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }),
              // Info styling
              ...(snackbar.severity === 'info' && {
                background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }),
            }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
        
        {/* Login Error Notification Dialog - Shows different types based on condition */}
        <Dialog
          open={errorDialogOpen}
            onClose={(event, reason) => {
              // Prevent closing on backdrop click or escape key
              if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
                return;
              }
              console.log('Dialog close triggered');
              setErrorDialogOpen(false);
              hasShownErrorRef.current = false; // Reset flag when dialog closes
            }}
            aria-labelledby="error-dialog-title"
            disableEscapeKeyDown={true}
            maxWidth="sm"
            fullWidth
            sx={{
              zIndex: 99999,
              '& .MuiDialog-paper': {
                borderRadius: '12px',
                minWidth: '400px',
                maxWidth: '500px',
              },
              '& .MuiBackdrop-root': {
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                zIndex: 99998,
              },
            }}
        >
          <DialogTitle
            id="error-dialog-title"
            sx={{
              backgroundColor: 
                errorDialogType === 'error' ? '#d32f2f' :
                errorDialogType === 'warning' ? '#ed6c02' :
                '#1976d2', // info
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '1.2rem',
              padding: '16px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            {errorDialogType === 'error' && <ErrorOutline sx={{ fontSize: '1.5rem' }} />}
            {errorDialogType === 'warning' && <Warning sx={{ fontSize: '1.5rem' }} />}
            {errorDialogType === 'info' && <Info sx={{ fontSize: '1.5rem' }} />}
            {errorDialogTitle}
          </DialogTitle>
          <DialogContent sx={{ padding: '24px' }}>
            <Typography
              variant="body1"
              sx={{
                fontSize: '1.1rem',
                color: '#333',
                lineHeight: 1.6,
                fontWeight: 500,
              }}
            >
              {errorDialogMessage}
            </Typography>
          </DialogContent>
          <DialogActions sx={{ padding: '16px 24px', gap: 1 }}>
            <Button
              onClick={() => {
                setErrorDialogOpen(false);
                hasShownErrorRef.current = false; // Reset flag when dialog closes
              }}
              variant="contained"
              fullWidth
              sx={{
                backgroundColor: 
                  errorDialogType === 'error' ? '#d32f2f' :
                  errorDialogType === 'warning' ? '#ed6c02' :
                  '#1976d2', // info
                color: '#FFFFFF',
                fontWeight: 600,
                py: 1.5,
                '&:hover': {
                  backgroundColor: 
                    errorDialogType === 'error' ? '#c62828' :
                    errorDialogType === 'warning' ? '#e65100' :
                    '#1565c0', // info
                },
              }}
            >
              OK
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
  );
};

export default AuthPage;
