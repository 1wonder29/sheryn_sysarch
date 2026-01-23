// src/pages/HomePage.jsx
import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
} from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import FacebookIcon from '@mui/icons-material/Facebook';
import PhoneIcon from '@mui/icons-material/Phone';
import api from '../api';
import backgroundImage from '../assets/logo.jpg';

const API_ROOT = 'http://localhost:5000';

const BACKGROUND_IMAGE = backgroundImage;

const HomePage = () => {
  const [officials, setOfficials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOfficials = async () => {
      try {
        setLoading(true);
        const res = await api.get('/officials');
        setOfficials(res.data || []);
      } catch (err) {
        console.error('Error fetching officials:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOfficials();
  }, []);

  const officialsWithPictures = officials.filter(o => o.picture_path);

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        overflow: 'hidden',
        margin: 0,
        padding: 0,
        position: 'relative',
      }}
    >
      {/* Left Section - Dark Green Panel (40%) */}
      <Box
        sx={{
          width: { xs: '100%', md: '40%' },
          backgroundColor: '#296041',
          color: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          padding: { xs: 3, md: 4 },
          overflowY: 'auto',
          justifyContent: 'space-between',
          position: 'relative',
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(255, 255, 255, 0.3)',
            borderRadius: '4px',
            '&:hover': {
              background: 'rgba(255, 255, 255, 0.5)',
            },
          },
        }}
      >
        {/* Map Section */}
        <Box
          sx={{
            width: '100%',
            height: { xs: '280px', md: '350px' },
            mb: 3,
            borderRadius: 2,
            overflow: 'hidden',
            border: '2px solid rgba(255, 255, 255, 0.25)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
            backgroundColor: '#1a1a1a',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5)',
            },
          }}
        >
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3861.031123758228!2d121.00218319999998!3d14.597302399999998!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397c900545d75dd%3A0x6ecdefed0f5412af!2sBarangay%20636%20Hall!5e0!3m2!1sen!2sph!4v1768241645641!5m2!1sen!2sph"
            width="100%"
            height="100%"
            style={{ 
              border: 0, 
              filter: 'grayscale(30%) brightness(0.7) contrast(1.1)',
            }}
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Barangay 636 Zone 64 Location"
          />
        </Box>

        {/* Contact Information */}
        <Box sx={{ mb: 3 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              mb: 2.5,
              gap: 1.5,
              padding: 1.5,
              borderRadius: 1,
              transition: 'background-color 0.3s ease, transform 0.2s ease',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                transform: 'translateX(4px)',
              },
            }}
          >
            <LocationOnIcon 
              sx={{ 
                fontSize: 26, 
                mt: 0.5, 
                flexShrink: 0,
                color: 'rgba(255, 255, 255, 0.9)',
                filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))',
              }} 
            />
            <Typography 
              variant="body1" 
              sx={{ 
                fontSize: '0.95rem', 
                lineHeight: 1.7,
                color: 'rgba(255, 255, 255, 0.95)',
              }}
            >
              635 Ruiloba, Sta. Mesa, Manila, 1016 Kalakhang Maynila
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              mb: 2.5,
              gap: 1.5,
              padding: 1.5,
              borderRadius: 1,
              transition: 'background-color 0.3s ease, transform 0.2s ease',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                transform: 'translateX(4px)',
              },
            }}
          >
            <FacebookIcon 
              sx={{ 
                fontSize: 26, 
                flexShrink: 0,
                color: 'rgba(255, 255, 255, 0.9)',
                filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))',
              }} 
            />
            <Typography 
              variant="body1" 
              sx={{ 
                fontSize: '0.95rem',
                color: 'rgba(255, 255, 255, 0.95)',
              }}
            >
              Brgy. 636 Z-64
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              mb: 2.5,
              gap: 1.5,
              padding: 1.5,
              borderRadius: 1,
              transition: 'background-color 0.3s ease, transform 0.2s ease',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                transform: 'translateX(4px)',
              },
            }}
          >
            <PhoneIcon 
              sx={{ 
                fontSize: 26, 
                flexShrink: 0,
                color: 'rgba(255, 255, 255, 0.9)',
                filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))',
              }} 
            />
            <Typography 
              variant="body1" 
              sx={{ 
                fontSize: '0.95rem',
                color: 'rgba(255, 255, 255, 0.95)',
              }}
            >
              09063565004 / 09171806059
            </Typography>
          </Box>
        </Box>

        {/* Barangay Description */}
        <Box 
          sx={{ 
            mt: 2,
            padding: 2,
            borderRadius: 2,
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <Typography
            variant="body1"
            sx={{
              fontSize: '0.9rem',
              lineHeight: 1.8,
              textAlign: 'justify',
              color: 'rgba(255, 255, 255, 0.95)',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
            }}
          >
            Barangay 636, Zone 64, is a local community within the Santa Mesa area of Manila, Philippines, known for its residential character, featuring places like the Barangay 636 Zone 64 Covered Court and hosting community activities like gift-giving events. It's part of the larger district of Sampaloc, experiencing typical urban life and local governance, with recent news highlighting community support and fire incidents in the area.
          </Typography>
        </Box>
      </Box>

      {/* Right Section - Photographic Panel (60%) */}
      <Box
        sx={{
          width: { xs: '100%', md: '60%' },
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Background Image */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            zIndex: 0,
          }}
        >
          <img
            src={BACKGROUND_IMAGE}
            alt="Barangay background"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
              display: 'block',
              transition: 'transform 0.5s ease',
            }}
            onLoad={(e) => {
              e.target.style.opacity = '1';
            }}
          />
          {/* Very subtle green overlay to keep branding but let the photo show clearly */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background:
                'linear-gradient(to bottom, rgba(41, 96, 65, 0.12), rgba(41, 96, 65, 0.2))',
              zIndex: 1,
            }}
          />
        </Box>

        {/* No overlay content here now – the composite photo (seal + officials)
            should be saved as src/assets/logo.jpg so it fills this area cleanly. */}
      </Box>
    </Box>
  );
};

export default HomePage;
