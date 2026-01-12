// src/pages/IncidentsPage.jsx
import React, { useEffect, useState } from 'react';
import {
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  InputAdornment,
  TablePagination,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import api from '../api';

const INCIDENT_TYPES = [
  'Complaint',
  'Blotter',
  'Domestic Violence',
  'Theft',
  'Vandalism',
  'Noise Disturbance',
  'Others',
];

const STATUS_OPTIONS = ['Open', 'Under Investigation', 'Closed'];

const initialForm = {
  incident_date: '',
  incident_type: 'Complaint',
  location: '',
  description: '',
  complainant_type: 'resident', // 'resident' or 'manual'
  complainant_id: '',
  complainant_name: '',
  respondent_id: '',
  status: 'Open',
};

const IncidentsPage = () => {
  const [residents, setResidents] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [form, setForm] = useState(initialForm);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchText, setSearchText] = useState('');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorForm, setErrorForm] = useState('');

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [errorEdit, setErrorEdit] = useState('');

  // Delete confirmation
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const fetchResidents = async () => {
    try {
      const res = await api.get('/residents');
      setResidents(res.data);
    } catch (err) {
      console.error(err);
      alert('Error fetching residents');
    }
  };

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const res = await api.get('/incidents');
      setIncidents(res.data);
    } catch (err) {
      console.error(err);
      alert('Error fetching incidents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResidents();
    fetchIncidents();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorForm('');

    if (!form.incident_date || !form.incident_type) {
      setErrorForm('Date & time and Incident Type are required.');
      return;
    }

    // Prepare data - only send complainant_id OR complainant_name, not both
    const submitData = {
      ...form,
      complainant_id: form.complainant_type === 'resident' ? form.complainant_id : null,
      complainant_name: form.complainant_type === 'manual' ? form.complainant_name : null,
    };
    delete submitData.complainant_type; // Remove the type field before sending

    try {
      setSaving(true);
      await api.post('/incidents', submitData);
      setForm(initialForm);
      await fetchIncidents();
    } catch (err) {
      console.error(err);
      setErrorForm(err.response?.data?.message || 'Error saving incident');
    } finally {
      setSaving(false);
    }
  };

  const residentName = (id) => {
    const r = residents.find((x) => x.id === id);
    if (!r) return '';
    return `${r.last_name}, ${r.first_name}`;
  };

  const getComplainantDisplay = (incident) => {
    if (incident.complainant_id) {
      return residentName(incident.complainant_id);
    }
    if (incident.complainant_name) {
      return incident.complainant_name;
    }
    return '';
  };

  const formatDateTime = (value) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString('en-PH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const filteredIncidents = incidents.filter((i) => {
    const dateOnly = i.incident_date ? i.incident_date.slice(0, 10) : '';
    const matchFrom = !dateFrom || dateOnly >= dateFrom;
    const matchTo = !dateTo || dateOnly <= dateTo;
    const matchStatus = statusFilter === 'All' || i.status === statusFilter;

    // searchType/Location/Names
    const complainant = getComplainantDisplay(i);
    const respondent = residentName(i.respondent_id);
    const haystack = (
      `${i.incident_type || ''} ${i.location || ''} ${complainant} ${respondent}`
    ).toLowerCase();
    const matchSearch =
      !searchText.trim() ||
      haystack.includes(searchText.trim().toLowerCase());

    return matchFrom && matchTo && matchStatus && matchSearch;
  });

  const pagedIncidents = filteredIncidents.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Edit
  const handleEditClick = (incident) => {
    setErrorEdit('');
    setEditData({
      ...incident,
      incident_date: incident.incident_date
        ? incident.incident_date.slice(0, 16)
        : '',
      complainant_type: incident.complainant_id ? 'resident' : (incident.complainant_name ? 'manual' : 'resident'),
      complainant_id: incident.complainant_id || '',
      complainant_name: incident.complainant_name || '',
      respondent_id: incident.respondent_id || '',
      status: incident.status || 'Open',
      location: incident.location || '',
      description: incident.description || '',
    });
    setEditOpen(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSave = async () => {
    setErrorEdit('');
    if (!editData.incident_date || !editData.incident_type) {
      setErrorEdit('Date & time and Incident Type are required.');
      return;
    }

    // Prepare data - only send complainant_id OR complainant_name, not both
    const submitData = {
      ...editData,
      complainant_id: editData.complainant_type === 'resident' ? editData.complainant_id : null,
      complainant_name: editData.complainant_type === 'manual' ? editData.complainant_name : null,
    };
    delete submitData.complainant_type; // Remove the type field before sending

    try {
      setSavingEdit(true);
      await api.put(`/incidents/${editData.id}`, submitData);
      setEditOpen(false);
      setEditData(null);
      await fetchIncidents();
    } catch (err) {
      console.error(err);
      setErrorEdit(err.response?.data?.message || 'Error updating incident');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleEditClose = () => {
    setEditOpen(false);
    setEditData(null);
  };

  // Delete
  const handleDeleteClick = (incident) => {
    setDeleteTarget(incident);
    setDeleteOpen(true);
  };

  const handleDeleteCancel = () => {
    setDeleteOpen(false);
    setDeleteTarget(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await api.delete(`/incidents/${deleteTarget.id}`);
      setDeleteOpen(false);
      setDeleteTarget(null);
      await fetchIncidents();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error deleting incident');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Incident Reports / Blotter
      </Typography>

      {/* Add Incident */}
      <Paper sx={{ p: 2, mb: 3 }} elevation={2}>
        <Typography variant="h6" gutterBottom>
          Add Incident
        </Typography>
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                type="datetime-local"
                label="Date & Time"
                name="incident_date"
                value={form.incident_date}
                onChange={handleChange}
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth required>
                <InputLabel>Incident Type</InputLabel>
                <Select
                  label="Incident Type"
                  name="incident_type"
                  value={form.incident_type}
                  onChange={handleChange}
                >
                  {INCIDENT_TYPES.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Location"
                name="location"
                value={form.location}
                onChange={handleChange}
                fullWidth
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Complainant (Kung sino ang nagreklamo)
              </Typography>
              <FormControl component="fieldset" sx={{ mb: 2 }}>
                <RadioGroup
                  row
                  name="complainant_type"
                  value={form.complainant_type}
                  onChange={(e) => {
                    setForm((prev) => ({
                      ...prev,
                      complainant_type: e.target.value,
                      complainant_id: e.target.value === 'resident' ? prev.complainant_id : '',
                      complainant_name: e.target.value === 'manual' ? prev.complainant_name : '',
                    }));
                  }}
                >
                  <FormControlLabel
                    value="resident"
                    control={<Radio />}
                    label="Link to Existing Resident"
                  />
                  <FormControlLabel
                    value="manual"
                    control={<Radio />}
                    label="Enter Name Manually"
                  />
                </RadioGroup>
              </FormControl>
            </Grid>
            {form.complainant_type === 'resident' ? (
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Select Resident</InputLabel>
                  <Select
                    label="Select Resident"
                    name="complainant_id"
                    value={form.complainant_id}
                    onChange={handleChange}
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {residents.map((r) => (
                      <MenuItem key={r.id} value={r.id}>
                        {r.last_name}, {r.first_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            ) : (
              <Grid item xs={12} md={6}>
                <TextField
                  label="Complainant Name"
                  name="complainant_name"
                  value={form.complainant_name}
                  onChange={handleChange}
                  fullWidth
                  placeholder="Enter complainant name"
                />
              </Grid>
            )}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Respondent</InputLabel>
                <Select
                  label="Respondent"
                  name="respondent_id"
                  value={form.respondent_id}
                  onChange={handleChange}
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {residents.map((r) => (
                    <MenuItem key={r.id} value={r.id}>
                      {r.last_name}, {r.first_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  label="Status"
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Description"
                name="description"
                value={form.description}
                onChange={handleChange}
                fullWidth
                multiline
                minRows={3}
                maxRows={6}
              />
            </Grid>

            {errorForm && (
              <Grid item xs={12}>
                <Typography color="error" variant="body2">
                  {errorForm}
                </Typography>
              </Grid>
            )}

            <Grid item xs={12}>
              <Button type="submit" variant="contained" disabled={saving}>
                {saving ? 'Saving...' : 'Save Incident'}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* Incident List */}
      <Paper sx={{ p: 2 }} elevation={2}>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 2,
            mb: 2,
            alignItems: 'center',
          }}
        >
          <Typography variant="h6">Incident List</Typography>
          <TextField
            type="date"
            size="small"
            label="From"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            type="date"
            size="small"
            label="To"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="All">All</MenuItem>
              {STATUS_OPTIONS.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            size="small"
            label="Search (type / location / name)"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            sx={{ minWidth: 260 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Date/Time</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Complainant</TableCell>
                <TableCell>Respondent</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pagedIncidents.map((i) => (
                <TableRow key={i.id}>
                  <TableCell>{i.id}</TableCell>
                  <TableCell>{formatDateTime(i.incident_date)}</TableCell>
                  <TableCell>{i.incident_type}</TableCell>
                  <TableCell>{i.location || ''}</TableCell>
                  <TableCell>{getComplainantDisplay(i)}</TableCell>
                  <TableCell>{residentName(i.respondent_id)}</TableCell>
                  <TableCell>{i.status}</TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={() => handleEditClick(i)}
                      sx={{ mr: 1 }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteClick(i)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {pagedIncidents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    No incidents found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={filteredIncidents.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25]}
        />
      </Paper>

      {/* Edit Incident Dialog */}
      <Dialog open={editOpen} onClose={handleEditClose} maxWidth="md" fullWidth>
        <DialogTitle>Edit Incident</DialogTitle>
        <DialogContent dividers>
          {editData && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={4}>
                <TextField
                  type="datetime-local"
                  label="Date & Time"
                  name="incident_date"
                  value={editData.incident_date ?? ''}
                  onChange={handleEditChange}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Incident Type</InputLabel>
                  <Select
                    label="Incident Type"
                    name="incident_type"
                    value={editData.incident_type ?? ''}
                    onChange={handleEditChange}
                  >
                    {INCIDENT_TYPES.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Location"
                  name="location"
                  value={editData.location ?? ''}
                  onChange={handleEditChange}
                  fullWidth
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Complainant (Kung sino ang nagreklamo)
                </Typography>
                <FormControl component="fieldset" sx={{ mb: 2 }}>
                  <RadioGroup
                    row
                    name="complainant_type"
                    value={editData.complainant_type ?? (editData.complainant_id ? 'resident' : 'manual')}
                    onChange={(e) => {
                      setEditData((prev) => ({
                        ...prev,
                        complainant_type: e.target.value,
                        complainant_id: e.target.value === 'resident' ? (prev.complainant_id ?? '') : '',
                        complainant_name: e.target.value === 'manual' ? (prev.complainant_name ?? '') : '',
                      }));
                    }}
                  >
                    <FormControlLabel
                      value="resident"
                      control={<Radio />}
                      label="Link to Existing Resident"
                    />
                    <FormControlLabel
                      value="manual"
                      control={<Radio />}
                      label="Enter Name Manually"
                    />
                  </RadioGroup>
                </FormControl>
              </Grid>
              {(editData.complainant_type ?? (editData.complainant_id ? 'resident' : 'manual')) === 'resident' ? (
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Select Resident</InputLabel>
                    <Select
                      label="Select Resident"
                      name="complainant_id"
                      value={editData.complainant_id ?? ''}
                      onChange={handleEditChange}
                    >
                      <MenuItem value="">
                        <em>None</em>
                      </MenuItem>
                      {residents.map((r) => (
                        <MenuItem key={r.id} value={r.id}>
                          {r.last_name}, {r.first_name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              ) : (
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Complainant Name"
                    name="complainant_name"
                    value={editData.complainant_name ?? ''}
                    onChange={handleEditChange}
                    fullWidth
                    placeholder="Enter complainant name"
                  />
                </Grid>
              )}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Respondent</InputLabel>
                  <Select
                    label="Respondent"
                    name="respondent_id"
                    value={editData.respondent_id ?? ''}
                    onChange={handleEditChange}
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {residents.map((r) => (
                      <MenuItem key={r.id} value={r.id}>
                        {r.last_name}, {r.first_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    label="Status"
                    name="status"
                    value={editData.status ?? 'Open'}
                    onChange={handleEditChange}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <MenuItem key={s} value={s}>
                        {s}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Description"
                  name="description"
                  value={editData.description ?? ''}
                  onChange={handleEditChange}
                  fullWidth
                  multiline
                  minRows={3}
                  maxRows={6}
                />
              </Grid>

              {errorEdit && (
                <Grid item xs={12}>
                  <Typography color="error" variant="body2">
                    {errorEdit}
                  </Typography>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditClose}>Cancel</Button>
          <Button
            onClick={handleEditSave}
            variant="contained"
            disabled={savingEdit}
          >
            {savingEdit ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Delete Incident</DialogTitle>
        <DialogContent dividers>
          <Typography>
            Are you sure you want to delete incident{' '}
            <strong>#{deleteTarget?.id}</strong> (
            {deleteTarget?.incident_type})?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDeleteConfirm}
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default IncidentsPage;
