// src/pages/SettingsPage.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Grid,
  Alert,
  Avatar,
  IconButton,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import SettingsIcon from '@mui/icons-material/Settings';
import api from '../api';
import barangayLogo from '../assets/barangay-logo.svg';

const SettingsPage = ({ onLogoChange }) => {
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Load current logo on mount
  useEffect(() => {
    const savedLogo = localStorage.getItem('barangayLogo');
    if (savedLogo) {
      setLogoPreview(savedLogo);
    } else {
      setLogoPreview(barangayLogo);
    }
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('Image size must be less than 2MB');
      return;
    }

    setError('');
    setSuccess('');
    setLogoFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveLogo = () => {
    if (!logoFile && !logoPreview) {
      setError('Please select an image file');
      return;
    }

    try {
      // Save to localStorage
      if (logoPreview) {
        localStorage.setItem('barangayLogo', logoPreview);
        setSuccess('Logo updated successfully!');
        setLogoFile(null);
        
        // Notify parent component
        if (onLogoChange) {
          onLogoChange();
        }
        
        // Trigger storage event for other tabs/components
        window.dispatchEvent(new Event('storage'));
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError('Failed to save logo. Please try again.');
      console.error('Error saving logo:', err);
    }
  };

  const handleResetLogo = () => {
    localStorage.removeItem('barangayLogo');
    setLogoPreview(barangayLogo);
    setLogoFile(null);
    setSuccess('Logo reset to default');
    setError('');
    
    // Notify parent component
    if (onLogoChange) {
      onLogoChange();
    }
    
    // Trigger storage event for other tabs/components
    window.dispatchEvent(new Event('storage'));
    
    // Clear success message after 3 seconds
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleRemoveLogo = () => {
    if (window.confirm('Are you sure you want to remove the custom logo?')) {
      localStorage.removeItem('barangayLogo');
      setLogoPreview(barangayLogo);
      setLogoFile(null);
      setSuccess('Custom logo removed');
      setError('');
      
      // Notify parent component
      if (onLogoChange) {
        onLogoChange();
      }
      
      // Trigger storage event for other tabs/components
      window.dispatchEvent(new Event('storage'));
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <SettingsIcon sx={{ mr: 1, color: '#2E7D32' }} />
        <Typography variant="h5" sx={{ color: '#2E7D32', fontWeight: 600 }}>
          Settings
        </Typography>
      </Box>

      <Paper sx={{ p: 3 }} elevation={2}>
        <Typography variant="h6" gutterBottom sx={{ color: '#2E7D32', mb: 3 }}>
          Barangay Logo
        </Typography>

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={4}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                p: 2,
                border: '2px dashed #E0E0E0',
                borderRadius: 2,
                bgcolor: '#FAFAFA',
              }}
            >
              <Typography variant="body2" gutterBottom color="text.secondary">
                Current Logo Preview
              </Typography>
              <Avatar
                src={logoPreview}
                alt="Barangay Logo"
                sx={{
                  width: 120,
                  height: 120,
                  border: '2px solid #2E7D32',
                  bgcolor: '#FFFFFF',
                }}
                variant="rounded"
              />
            </Box>
          </Grid>

          <Grid item xs={12} md={8}>
            <Box sx={{ mb: 2 }}>
              <input
                accept="image/*"
                style={{ display: 'none' }}
                id="logo-upload"
                type="file"
                onChange={handleFileChange}
              />
              <label htmlFor="logo-upload">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<CloudUploadIcon />}
                  sx={{
                    borderColor: '#2E7D32',
                    color: '#2E7D32',
                    '&:hover': {
                      borderColor: '#1B5E20',
                      backgroundColor: 'rgba(46, 125, 50, 0.04)',
                    },
                  }}
                >
                  Upload New Logo
                </Button>
              </label>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                onClick={handleSaveLogo}
                disabled={!logoFile}
                sx={{
                  backgroundColor: '#2E7D32',
                  '&:hover': {
                    backgroundColor: '#1B5E20',
                  },
                }}
              >
                Save Logo
              </Button>

              {localStorage.getItem('barangayLogo') && (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={handleRemoveLogo}
                >
                  Remove Custom Logo
                </Button>
              )}

              <Button
                variant="outlined"
                onClick={handleResetLogo}
                sx={{
                  borderColor: '#757575',
                  color: '#757575',
                }}
              >
                Reset to Default
              </Button>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              <strong>Guidelines:</strong>
              <br />• Supported formats: JPG, PNG, SVG, GIF
              <br />• Maximum file size: 2MB
              <br />• Recommended size: 200x200px or larger (square)
              <br />• The logo will appear in the navigation bar and login page
            </Typography>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default SettingsPage;
