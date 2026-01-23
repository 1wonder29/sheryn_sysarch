// src/pages/ResidentsPage.jsx
import React, { useEffect, useState } from 'react';
import {
  Paper,
  Typography,
  Grid,
  TextField,
  MenuItem,
  Button,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import api from '../api';

const initialForm = {
  last_name: '',
  first_name: '',
  middle_name: '',
  suffix: '',
  sex: 'Male',
  birthdate: '',
  civil_status: '',
  contact_no: '',
  address: '',
};

const ResidentsPage = () => {
  const [residents, setResidents] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [sexFilter, setSexFilter] = useState('All');

  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [updating, setUpdating] = useState(false);

  const fetchResidents = async () => {
    try {
      setLoading(true);
      const res = await api.get('/residents');
      setResidents(res.data);
    } catch (err) {
      console.error(err);
      alert('Error fetching residents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResidents();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.post('/residents', form);
      setForm(initialForm);
      fetchResidents();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error saving resident');
    } finally {
      setSaving(false);
    }
  };

  const handleEditClick = (resident) => {
    setEditData({ ...resident });
    setEditOpen(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSave = async () => {
    try {
      setUpdating(true);
      await api.put(`/residents/${editData.id}`, editData);
      setEditOpen(false);
      setEditData(null);
      fetchResidents();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error updating resident');
    } finally {
      setUpdating(false);
    }
  };

  const handleEditClose = () => {
    setEditOpen(false);
    setEditData(null);
  };

  const handleDeleteResident = async (resident) => {
    const fullName = `${resident.last_name}, ${resident.first_name}${
      resident.middle_name ? ' ' + resident.middle_name : ''
    }`;

    if (
      !window.confirm(
        `Are you sure you want to delete resident "${fullName}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await api.delete(`/residents/${resident.id}`);
      await fetchResidents();
      alert('Resident deleted successfully!');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error deleting resident');
    }
  };

  const filteredResidents = residents.filter((r) => {
    const str = (
      `${r.last_name} ${r.first_name} ${r.middle_name || ''} ${
        r.address || ''
      }`
    ).toLowerCase();
    const matchSearch = str.includes(search.toLowerCase());
    const matchSex = sexFilter === 'All' || r.sex === sexFilter;
    return matchSearch && matchSex;
  });

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Residents
      </Typography>

      <Paper sx={{ p: 2, mb: 3 }} elevation={2}>
        <Typography variant="h6" gutterBottom>
          Add Resident
        </Typography>
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                label="Last Name"
                name="last_name"
                value={form.last_name}
                onChange={handleChange}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="First Name"
                name="first_name"
                value={form.first_name}
                onChange={handleChange}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Middle Name"
                name="middle_name"
                value={form.middle_name}
                onChange={handleChange}
                fullWidth
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                label="Suffix"
                name="suffix"
                value={form.suffix}
                onChange={handleChange}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                select
                label="Sex"
                name="sex"
                value={form.sex}
                onChange={handleChange}
                fullWidth
              >
                <MenuItem value="Male">Male</MenuItem>
                <MenuItem value="Female">Female</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                type="date"
                label="Birthdate"
                name="birthdate"
                value={form.birthdate}
                onChange={handleChange}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="Civil Status"
                name="civil_status"
                value={form.civil_status}
                onChange={handleChange}
                fullWidth
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                label="Contact No"
                name="contact_no"
                value={form.contact_no}
                onChange={handleChange}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={8}>
              <TextField
                label="Address"
                name="address"
                value={form.address}
                onChange={handleChange}
                fullWidth
              />
            </Grid>

            <Grid item xs={12}>
              <Button type="submit" variant="contained" disabled={saving}>
                {saving ? 'Saving...' : 'Add Resident'}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      <Paper sx={{ p: 2 }} elevation={2}>
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            flexWrap: 'wrap',
            mb: 2,
            alignItems: 'center',
          }}
        >
          <Typography variant="h6">Resident List</Typography>
          <TextField
            size="small"
            label="Search (name / address)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Sex</InputLabel>
            <Select
              label="Sex"
              value={sexFilter}
              onChange={(e) => setSexFilter(e.target.value)}
            >
              <MenuItem value="All">All</MenuItem>
              <MenuItem value="Male">Male</MenuItem>
              <MenuItem value="Female">Female</MenuItem>
              <MenuItem value="Other">Other</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Full Name</TableCell>
                  <TableCell>Sex</TableCell>
                  <TableCell>Birthdate</TableCell>
                  <TableCell>Civil Status</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Address</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredResidents.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.id}</TableCell>
                    <TableCell>
                      {r.last_name}, {r.first_name} {r.middle_name || ''}{' '}
                      {r.suffix || ''}
                    </TableCell>
                    <TableCell>{r.sex}</TableCell>
                    <TableCell>{r.birthdate || ''}</TableCell>
                    <TableCell>{r.civil_status || ''}</TableCell>
                    <TableCell>{r.contact_no || ''}</TableCell>
                    <TableCell>{r.address || ''}</TableCell>
                    <TableCell align="center">
                      <Box
                        sx={{
                          display: 'flex',
                          gap: 0.5,
                          justifyContent: 'center',
                        }}
                      >
                        <IconButton
                          size="small"
                          onClick={() => handleEditClick(r)}
                          color="primary"
                          title="Edit Resident"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteResident(r)}
                          color="error"
                          title="Delete Resident"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onClose={handleEditClose} maxWidth="md" fullWidth>
        <DialogTitle>Edit Resident</DialogTitle>
        <DialogContent dividers>
          {editData && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Last Name"
                  name="last_name"
                  value={editData.last_name}
                  onChange={handleEditChange}
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="First Name"
                  name="first_name"
                  value={editData.first_name}
                  onChange={handleEditChange}
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Middle Name"
                  name="middle_name"
                  value={editData.middle_name || ''}
                  onChange={handleEditChange}
                  fullWidth
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <TextField
                  label="Suffix"
                  name="suffix"
                  value={editData.suffix || ''}
                  onChange={handleEditChange}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  select
                  label="Sex"
                  name="sex"
                  value={editData.sex}
                  onChange={handleEditChange}
                  fullWidth
                >
                  <MenuItem value="Male">Male</MenuItem>
                  <MenuItem value="Female">Female</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  type="date"
                  label="Birthdate"
                  name="birthdate"
                  value={editData.birthdate || ''}
                  onChange={handleEditChange}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Civil Status"
                  name="civil_status"
                  value={editData.civil_status || ''}
                  onChange={handleEditChange}
                  fullWidth
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  label="Contact No"
                  name="contact_no"
                  value={editData.contact_no || ''}
                  onChange={handleEditChange}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={8}>
                <TextField
                  label="Address"
                  name="address"
                  value={editData.address || ''}
                  onChange={handleEditChange}
                  fullWidth
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditClose}>Cancel</Button>
          <Button
            onClick={handleEditSave}
            variant="contained"
            disabled={updating}
          >
            {updating ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ResidentsPage;
