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
      <AppBar position="static">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => setPage('home')}
            sx={{ 
              mr: 1,
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              },
            }}
          >
            <img 
              src={logo} 
              alt="Barangay Logo" 
              style={{ 
                height: '40px', 
                width: '40px',
                cursor: 'pointer',
                objectFit: 'contain',
              }} 
            />
          </IconButton>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              mr: 2,
              cursor: 'pointer',
              '&:hover': {
                opacity: 0.9,
              },
            }}
            onClick={() => setPage('home')}
          >
            <Typography 
              variant="body2" 
              sx={{ 
                fontWeight: 700,
                fontSize: '0.75rem',
                lineHeight: 1.2,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
              }}
            >
              BARANGAY 636 ZONE 64,
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                fontWeight: 700,
                fontSize: '0.75rem',
                lineHeight: 1.2,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
              }}
            >
              SANTA MESA MANILA
            </Typography>
          </Box>
          <Typography 
            variant="h6" 
            sx={{ 
              flexGrow: 1,
              fontWeight: 600,
              cursor: 'pointer',
              '&:hover': {
                opacity: 0.9,
              },
            }}
            onClick={() => setPage('home')}
          >
            Barangay Information System
          </Typography>

          <Button
            color={page === 'home' ? 'secondary' : 'inherit'}
            startIcon={<HomeIcon />}
            onClick={() => setPage('home')}
            sx={{
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              },
            }}
          >
            Home
          </Button>
          <Button
            color={page === 'household-residents' ? 'secondary' : 'inherit'}
            startIcon={<PeopleIcon />}
            onClick={() => setPage('household-residents')}
            sx={{
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              },
            }}
          >
            Household & Residents
          </Button>
          <Button
            color={page === 'incidents' ? 'secondary' : 'inherit'}
            startIcon={<ReportIcon />}
            onClick={() => setPage('incidents')}
            sx={{
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              },
            }}
          >
            Incidents
          </Button>
          <Button
            color={page === 'services' ? 'secondary' : 'inherit'}
            startIcon={<VolunteerActivismIcon />}
            onClick={() => setPage('services')}
            sx={{
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              },
            }}
          >
            Services
          </Button>
          <Button
            color={page === 'certificates' ? 'secondary' : 'inherit'}
            onClick={() => setPage('certificates')}
            sx={{
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              },
            }}
          >
            Certificates
          </Button>
          <Button
            color={page === 'officials' ? 'secondary' : 'inherit'}
            startIcon={<GroupsIcon />}
            onClick={() => setPage('officials')}
            sx={{
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              },
            }}
          >
            Officials
          </Button>
          <Button
            color={page === 'history-logs' ? 'secondary' : 'inherit'}
            startIcon={<HistoryIcon />}
            onClick={() => setPage('history-logs')}
            sx={{
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              },
            }}
          >
            History Logs
          </Button>
          <Button
            color={page === 'settings' ? 'secondary' : 'inherit'}
            startIcon={<SettingsIcon />}
            onClick={() => setPage('settings')}
            sx={{
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              },
            }}
          >
            Settings
          </Button>

          <Typography variant="body2" sx={{ mx: 2 }}>
            {user?.full_name} ({user?.role})
          </Typography>
          <Button
            color="inherit"
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
          >
            Logout
          </Button>
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
