// src/pages/HistoryLogsPage.jsx
import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  Pagination,
  Card,
  CardContent,
  Avatar,
  Divider,
  Stack,
  Grid,
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import PersonIcon from '@mui/icons-material/Person';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import api from '../api';
import { setAuthToken } from '../api';

const HistoryLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const logsPerPage = 50;

  useEffect(() => {
    // Ensure token is set before loading logs
    const token = localStorage.getItem('token');
    if (token) {
      setAuthToken(token);
    }
    loadLogs();
  }, [page]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Ensure token is set
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please log in to view history logs.');
        setLoading(false);
        return;
      }
      setAuthToken(token);
      
      const offset = (page - 1) * logsPerPage;
      const res = await api.get(`/history-logs?limit=${logsPerPage}&offset=${offset}`);
      setLogs(res.data || []);
      // Calculate total pages (assuming we have at least the current page's data)
      if (res.data && res.data.length === logsPerPage) {
        setTotalPages(page + 1); // At least one more page
      } else {
        setTotalPages(page);
      }
    } catch (err) {
      console.error('Error loading history logs:', err);
      if (err.response?.status === 401) {
        setError('Unauthorized. Please log out and log in again.');
      } else if (err.response?.status === 500 && err.response?.data?.error === 'Table not found') {
        setError('Database table not found. Please run the migration: migration_add_history_logs_table.sql');
      } else {
        const errorMsg = err.response?.data?.message || 'Failed to load history logs.';
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-PH', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRoleColor = (role) => {
    if (!role) return 'default';
    const roleLower = role.toLowerCase();
    if (roleLower.includes('punong') || roleLower.includes('chairman') || roleLower.includes('captain')) {
      return 'primary';
    }
    if (roleLower.includes('secretary') || roleLower.includes('treasurer')) {
      return 'success';
    }
    if (roleLower.includes('kagawad')) {
      return 'info';
    }
    if (role === 'Admin') {
      return 'primary';
    }
    if (role === 'Staff') {
      return 'default';
    }
    return 'secondary';
  };

  const getActionIcon = (action) => {
    const actionLower = action.toLowerCase();
    if (actionLower.includes('created') || actionLower.includes('added')) {
      return '➕';
    }
    if (actionLower.includes('updated') || actionLower.includes('modified')) {
      return '✏️';
    }
    if (actionLower.includes('deleted') || actionLower.includes('removed')) {
      return '🗑️';
    }
    if (actionLower.includes('released') || actionLower.includes('certificate')) {
      return '📄';
    }
    if (actionLower.includes('recorded') || actionLower.includes('incident')) {
      return '📋';
    }
    return '📝';
  };

  return (
    <Box>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <HistoryIcon sx={{ fontSize: 48, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              History Logs
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Security & Audit Trail - Track all system actions
            </Typography>
          </Box>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={60} />
        </Box>
      ) : logs.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <HistoryIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No History Logs Found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            System actions will appear here once activities are performed.
          </Typography>
        </Paper>
      ) : (
        <>
          {/* Logs Display */}
          <Grid container spacing={2}>
            {logs.map((log) => (
              <Grid item xs={12} key={log.id}>
                <Card
                  elevation={2}
                  sx={{
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      elevation: 4,
                      transform: 'translateY(-2px)',
                    },
                    borderLeft: '4px solid',
                    borderLeftColor: 'primary.main',
                  }}
                >
                  <CardContent>
                    <Stack spacing={2}>
                      {/* Action Description */}
                      <Box>
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 500,
                            fontSize: '1.1rem',
                            mb: 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                          }}
                        >
                          <span style={{ fontSize: '1.3rem' }}>
                            {getActionIcon(log.action)}
                          </span>
                          {log.action}
                        </Typography>
                      </Box>

                      <Divider />

                      {/* User and Role Info */}
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                          flexWrap: 'wrap',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar
                            sx={{
                              width: 36,
                              height: 36,
                              bgcolor: 'primary.main',
                            }}
                          >
                            <PersonIcon fontSize="small" />
                          </Avatar>
                          <Box>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 600, color: 'text.primary' }}
                            >
                              {log.user_name || 'System'}
                            </Typography>
                            {log.user_role && (
                              <Chip
                                label={log.user_role}
                                color={getRoleColor(log.user_role)}
                                size="small"
                                sx={{ mt: 0.5, height: 20, fontSize: '0.7rem' }}
                              />
                            )}
                          </Box>
                        </Box>

                        {/* Date and Time */}
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            ml: 'auto',
                            color: 'text.secondary',
                          }}
                        >
                          <AccessTimeIcon fontSize="small" />
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {formatDate(log.created_at)}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ fontSize: '0.75rem' }}
                            >
                              {formatTime(log.created_at)}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Pagination */}
          {logs.length > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(event, value) => setPage(value)}
                color="primary"
                size="large"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default HistoryLogsPage;
