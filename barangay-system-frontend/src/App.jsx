// src/App.jsx
import React, { useEffect, useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Box,
  IconButton,
} from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import PeopleIcon from '@mui/icons-material/People';
import HomeIcon from '@mui/icons-material/Home';
import ReportIcon from '@mui/icons-material/Report';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import LogoutIcon from '@mui/icons-material/Logout';
import HistoryIcon from '@mui/icons-material/History';
import DescriptionIcon from '@mui/icons-material/Description';
import CertificatesPage from './pages/CertificatesPage';
import HouseholdResidentsPage from './pages/HouseholdResidentsPage.jsx';
import IncidentsPage from './pages/IncidentsPage.jsx';
import ServicesPage from './pages/ServicesPage.jsx';
import AuthPage from './pages/AuthPage.jsx';
import { setAuthToken } from './api.js';
import OfficialsPage from './pages/OfficialsPage.jsx';
import HistoryLogsPage from './pages/HistoryLogsPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import HomePage from './pages/HomePage.jsx';
import SettingsIcon from '@mui/icons-material/Settings';
import barangayLogo from './assets/barangay-logo.svg';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';

const App = () => {
  const [page, setPage] = useState('home');
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [logo, setLogo] = useState(() => {
    const savedLogo = localStorage.getItem('barangayLogo');
    return savedLogo || barangayLogo;
  });

  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  // Listen for logo changes (from Settings page)
  useEffect(() => {
    const handleStorageChange = () => {
      const savedLogo = localStorage.getItem('barangayLogo');
      setLogo(savedLogo || barangayLogo);
    };

    // Listen for storage events (when Settings page updates logo)
    window.addEventListener('storage', handleStorageChange);
    
    // Also check periodically (for same-tab updates)
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

  const handleLogin = ({ token, user }) => {
    setToken(token);
    setUser(user);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setAuthToken(null);
  };

const renderPage = () => {
  switch (page) {
    case 'home':
      return <HomePage />;
    case 'household-residents':
      return <HouseholdResidentsPage />;
    case 'incidents':
      return <IncidentsPage />;
    case 'services':
      return <ServicesPage />;
    case 'certificates':
      return <CertificatesPage />;
    case 'officials':
      return <OfficialsPage />;
    case 'history-logs':
      return <HistoryLogsPage />;
    case 'settings':
      return <SettingsPage onLogoChange={() => {
        const savedLogo = localStorage.getItem('barangayLogo');
        setLogo(savedLogo || barangayLogo);
      }} />;
    default:
      return <HomePage />;
  }
};


  // If not logged in, show AuthPage
  if (!token || !user) {
    return <AuthPage onLogin={handleLogin} />;
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      <AppBar 
        position="static"
        sx={{
          background: 'linear-gradient(135deg, #2E7D32 0%, #1B5E20 100%)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        }}
      >
        <Toolbar sx={{ py: 1, minHeight: '70px !important' }}>
          {/* Logo and Title Section */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mr: 3 }}>
            <IconButton
              edge="start"
              color="inherit"
              onClick={() => setPage('home')}
              sx={{ 
                p: 1,
                transition: 'all 0.3s ease',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  transform: 'scale(1.05)',
                },
              }}
            >
              <img 
                src={logo} 
                alt="Barangay Logo" 
                style={{ 
                  height: '45px', 
                  width: '45px',
                  cursor: 'pointer',
                  objectFit: 'contain',
                }} 
              />
            </IconButton>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                transition: 'opacity 0.2s ease',
                '&:hover': {
                  opacity: 0.9,
                },
              }}
              onClick={() => setPage('home')}
            >
              <Typography 
                variant="body2" 
                sx={{ 
                  fontWeight: 800,
                  fontSize: '0.7rem',
                  lineHeight: 1.2,
                  letterSpacing: '0.8px',
                  textTransform: 'uppercase',
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
                }}
              >
                BARANGAY 636 ZONE 64,
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontWeight: 800,
                  fontSize: '0.7rem',
                  lineHeight: 1.2,
                  letterSpacing: '0.8px',
                  textTransform: 'uppercase',
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
                }}
              >
                SANTA MESA MANILA
              </Typography>
            </Box>
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          <Divider 
            orientation="vertical" 
            flexItem 
            sx={{ 
              mx: 1.5, 
              borderColor: 'rgba(255, 255, 255, 0.3)',
              height: '40px',
            }} 
          />

          {/* Navigation Buttons */}
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button
              color={page === 'home' ? 'secondary' : 'inherit'}
              startIcon={<HomeIcon />}
              onClick={() => setPage('home')}
              sx={{
                minWidth: 'auto',
                px: 1.5,
                py: 1,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: page === 'home' ? 700 : 500,
                fontSize: '0.9rem',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                ...(page === 'home' ? {
                  backgroundColor: 'rgba(255, 255, 255, 0.25)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.35)',
                    transform: 'translateY(-2px)',
                  },
                } : {
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    transform: 'translateY(-2px)',
                  },
                }),
              }}
            >
              Home
            </Button>
            <Button
              color={page === 'household-residents' ? 'secondary' : 'inherit'}
              startIcon={<PeopleIcon />}
              onClick={() => setPage('household-residents')}
              sx={{
                minWidth: 'auto',
                px: 1.5,
                py: 1,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: page === 'household-residents' ? 700 : 500,
                fontSize: '0.9rem',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                ...(page === 'household-residents' ? {
                  backgroundColor: 'rgba(255, 255, 255, 0.25)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.35)',
                    transform: 'translateY(-2px)',
                  },
                } : {
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    transform: 'translateY(-2px)',
                  },
                }),
              }}
            >
              Household & Residents
            </Button>
            <Button
              color={page === 'incidents' ? 'secondary' : 'inherit'}
              startIcon={<ReportIcon />}
              onClick={() => setPage('incidents')}
              sx={{
                minWidth: 'auto',
                px: 1.5,
                py: 1,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: page === 'incidents' ? 700 : 500,
                fontSize: '0.9rem',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                ...(page === 'incidents' ? {
                  backgroundColor: 'rgba(255, 255, 255, 0.25)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.35)',
                    transform: 'translateY(-2px)',
                  },
                } : {
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    transform: 'translateY(-2px)',
                  },
                }),
              }}
            >
              Incidents
            </Button>
            <Button
              color={page === 'services' ? 'secondary' : 'inherit'}
              startIcon={<VolunteerActivismIcon />}
              onClick={() => setPage('services')}
              sx={{
                minWidth: 'auto',
                px: 1.5,
                py: 1,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: page === 'services' ? 700 : 500,
                fontSize: '0.9rem',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                ...(page === 'services' ? {
                  backgroundColor: 'rgba(255, 255, 255, 0.25)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.35)',
                    transform: 'translateY(-2px)',
                  },
                } : {
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    transform: 'translateY(-2px)',
                  },
                }),
              }}
            >
              Services
            </Button>
            <Button
              color={page === 'certificates' ? 'secondary' : 'inherit'}
              startIcon={<DescriptionIcon />}
              onClick={() => setPage('certificates')}
              sx={{
                minWidth: 'auto',
                px: 1.5,
                py: 1,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: page === 'certificates' ? 700 : 500,
                fontSize: '0.9rem',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                ...(page === 'certificates' ? {
                  backgroundColor: 'rgba(255, 255, 255, 0.25)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.35)',
                    transform: 'translateY(-2px)',
                  },
                } : {
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    transform: 'translateY(-2px)',
                  },
                }),
              }}
            >
              Certificates
            </Button>
            <Button
              color={page === 'officials' ? 'secondary' : 'inherit'}
              startIcon={<GroupsIcon />}
              onClick={() => setPage('officials')}
              sx={{
                minWidth: 'auto',
                px: 1.5,
                py: 1,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: page === 'officials' ? 700 : 500,
                fontSize: '0.9rem',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                ...(page === 'officials' ? {
                  backgroundColor: 'rgba(255, 255, 255, 0.25)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.35)',
                    transform: 'translateY(-2px)',
                  },
                } : {
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    transform: 'translateY(-2px)',
                  },
                }),
              }}
            >
              Officials
            </Button>
            <Button
              color={page === 'history-logs' ? 'secondary' : 'inherit'}
              startIcon={<HistoryIcon />}
              onClick={() => setPage('history-logs')}
              sx={{
                minWidth: 'auto',
                px: 1.5,
                py: 1,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: page === 'history-logs' ? 700 : 500,
                fontSize: '0.9rem',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                ...(page === 'history-logs' ? {
                  backgroundColor: 'rgba(255, 255, 255, 0.25)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.35)',
                    transform: 'translateY(-2px)',
                  },
                } : {
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    transform: 'translateY(-2px)',
                  },
                }),
              }}
            >
              History Logs
            </Button>
            <Button
              color={page === 'settings' ? 'secondary' : 'inherit'}
              startIcon={<SettingsIcon />}
              onClick={() => setPage('settings')}
              sx={{
                minWidth: 'auto',
                px: 1.5,
                py: 1,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: page === 'settings' ? 700 : 500,
                fontSize: '0.9rem',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                ...(page === 'settings' ? {
                  backgroundColor: 'rgba(255, 255, 255, 0.25)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.35)',
                    transform: 'translateY(-2px)',
                  },
                } : {
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    transform: 'translateY(-2px)',
                  },
                }),
              }}
            >
              Settings
            </Button>
          </Box>

          <Divider 
            orientation="vertical" 
            flexItem 
            sx={{ 
              mx: 1.5, 
              borderColor: 'rgba(255, 255, 255, 0.3)',
              height: '40px',
            }} 
          />

          {/* User Info and Logout */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Chip
              label={`${user?.full_name || 'User'} (${user?.role || 'Staff'})`}
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                fontWeight: 600,
                fontSize: '0.85rem',
                height: '32px',
                '& .MuiChip-label': {
                  px: 1.5,
                },
              }}
            />
            <Button
              color="inherit"
              startIcon={<LogoutIcon />}
              onClick={handleLogout}
              sx={{
                minWidth: 'auto',
                px: 1.5,
                py: 1,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.9rem',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  transform: 'translateY(-2px)',
                },
              }}
            >
              Logout
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {page === 'home' ? (
        <Box sx={{ width: '100%', height: 'calc(100vh - 64px)' }}>
          {renderPage()}
        </Box>
      ) : (
        <Container maxWidth="lg" sx={{ py: 3 }}>
          {renderPage()}
        </Container>
      )}
    </Box>
  );
};

export default App;
