// src/pages/AuthPage.jsx
import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import api from '../api';
import barangayLogo from '../assets/barangay-logo.svg';

const AuthPage = ({ onLogin }) => {
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
    if (msgFromServer) return msgFromServer;

    // If backend returned HTML (e.g. Cannot POST /something)
    const raw = err?.response?.data;
    if (typeof raw === 'string' && raw.includes('Cannot POST')) {
      return 'API route not found. Check that server.js has /api/auth/... routes and is running on port 5000.';
    }

    return fallback;
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorLogin('');
    try {
      setLoadingLogin(true);
      // baseURL: http://localhost:5000/api + /auth/login = /api/auth/login
      const res = await api.post('/auth/login', loginForm);
      onLogin({ token: res.data.token, user: res.data.user });
    } catch (err) {
      console.error('Login error:', err);
      setErrorLogin(normalizeError(err, 'Login failed'));
    } finally {
      setLoadingLogin(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorRegister('');
    setSuccessRegister('');
    try {
      setLoadingRegister(true);
      // baseURL: http://localhost:5000/api + /auth/register = /api/auth/register
      await api.post('/auth/register', registerForm);
      setSuccessRegister('User registered successfully. You can now log in.');
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
      setErrorRegister(normalizeError(err, 'Registration failed'));
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
                onSubmit={handleLoginSubmit}
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
                  type="password"
                  value={loginForm.password}
                  onChange={handleLoginChange}
                  fullWidth
                  required
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
                  disabled={loadingLogin}
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
                  type="password"
                  value={registerForm.password}
                  onChange={handleRegisterChange}
                  fullWidth
                  required
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
    </Box>
  );
};

export default AuthPage;
