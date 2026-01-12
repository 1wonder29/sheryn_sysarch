import React, { useEffect, useState } from 'react';
import {
  Box,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  IconButton,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '../api';

const POSITIONS = [
  'Chairman',
  'Kagawad',
  'Secretary',
  'Treasurer',
];

const API_ROOT = 'http://localhost:5000'; // for signature images

const emptyForm = {
  id: null,
  full_name: '',
  position: 'Chairman',
  order_no: 0,
  is_captain: false,
  is_secretary: false,
};

const OfficialsPage = () => {
  const [officials, setOfficials] = useState([]);
  const [loading, setLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [signatureFile, setSignatureFile] = useState(null);
  const [pictureFile, setPictureFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadOfficials = async () => {
    try {
      setLoading(true);
      const res = await api.get('/officials');
      setOfficials(res.data || []);
    } catch (err) {
      console.error('Error loading officials', err);
      alert('Error loading officials');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOfficials();
  }, []);

  const openAddDialog = () => {
    setForm({
      ...emptyForm,
    });
    setSignatureFile(null);
    setPictureFile(null);
    setError('');
    setDialogOpen(true);
  };

  const openEditDialog = (off) => {
    setForm({
      id: off.id,
      full_name: off.full_name,
      position: off.position,
      order_no: off.order_no ?? 0,
      is_captain: !!off.is_captain,
      is_secretary: !!off.is_secretary,
    });
    setSignatureFile(null);
    setPictureFile(null);
    setError('');
    setDialogOpen(true);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setForm((prev) => ({ ...prev, [name]: checked }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handlePositionChange = (e) => {
    const value = e.target.value;
    setForm((prev) => ({
      ...prev,
      position: value,
      is_captain: value === 'Chairman' ? true : prev.is_captain,
      is_secretary:
        value === 'Secretary' ? true : prev.is_secretary,
    }));
  };

  const handleSignatureFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setSignatureFile(file);
  };

  const handlePictureFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setPictureFile(file);
  };

  const validateForm = () => {
    if (!form.full_name.trim()) return 'Full name is required.';
    if (!form.position.trim()) return 'Position is required.';
    return '';
  };

  const handleSave = async () => {
    const msg = validateForm();
    if (msg) {
      setError(msg);
      return;
    }

    try {
      setSaving(true);
      const fd = new FormData();
      fd.append('full_name', form.full_name);
      fd.append('position', form.position);
      fd.append('order_no', form.order_no || 0);
      fd.append('is_captain', form.is_captain ? '1' : '0');
      fd.append('is_secretary', form.is_secretary ? '1' : '0');
      if (signatureFile) {
        fd.append('signature', signatureFile);
      }
      if (pictureFile) {
        fd.append('picture', pictureFile);
      }

      if (form.id) {
        await api.put(`/officials/${form.id}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post('/officials', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      setDialogOpen(false);
      await loadOfficials();
    } catch (err) {
      console.error('Error saving official', err);
      setError(err.response?.data?.message || 'Error saving official');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (off) => {
    setToDelete(off);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!toDelete) return;
    try {
      setDeleting(true);
      await api.delete(`/officials/${toDelete.id}`);
      setDeleteOpen(false);
      setToDelete(null);
      await loadOfficials();
    } catch (err) {
      console.error('Error deleting official', err);
      alert(err.response?.data?.message || 'Error deleting official');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Barangay Officials
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }} elevation={2}>
        <Grid container justifyContent="space-between" alignItems="center">
          <Grid item>
            <Typography variant="h6">Officials List</Typography>
          </Grid>
          <Grid item>
            <Button variant="contained" onClick={openAddDialog}>
              Add Official
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 2 }} elevation={2}>
        {loading ? (
          <Typography>Loading officials...</Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Order</TableCell>
                  <TableCell>Full Name</TableCell>
                  <TableCell>Position</TableCell>
                  <TableCell>Captain</TableCell>
                  <TableCell>Secretary</TableCell>
                  <TableCell>Picture</TableCell>
                  <TableCell>Signature</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {officials.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      No officials encoded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  officials.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell>{o.order_no}</TableCell>
                      <TableCell>{o.full_name}</TableCell>
                      <TableCell>{o.position}</TableCell>
                      <TableCell>{o.is_captain ? 'Yes' : ''}</TableCell>
                      <TableCell>{o.is_secretary ? 'Yes' : ''}</TableCell>
                      <TableCell>
                        {o.picture_path ? (
                          <img
                            src={`${API_ROOT}${o.picture_path}`}
                            alt={o.full_name}
                            style={{ height: 50, width: 50, objectFit: 'cover', borderRadius: '4px' }}
                          />
                        ) : (
                          <Typography variant="caption">None</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {o.signature_path ? (
                          <img
                            src={`${API_ROOT}${o.signature_path}`}
                            alt="Signature"
                            style={{ height: 40 }}
                          />
                        ) : (
                          <Typography variant="caption">None</Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => openEditDialog(o)}
                          sx={{ mr: 1 }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteClick(o)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Add/Edit dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {form.id ? 'Edit Official' : 'Add Official'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Full Name"
                name="full_name"
                value={form.full_name}
                onChange={handleChange}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                select
                label="Position"
                name="position"
                value={form.position}
                onChange={handlePositionChange}
                fullWidth
              >
                {POSITIONS.map((p) => (
                  <MenuItem key={p} value={p}>
                    {p}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Order No."
                name="order_no"
                type="number"
                value={form.order_no}
                onChange={handleChange}
                fullWidth
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2">
                Chairman and Secretary flags are used to
                auto-fill Certificates.
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Button variant="outlined" component="label" fullWidth>
                {pictureFile ? 'Change Picture' : 'Upload Picture'}
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handlePictureFileChange}
                />
              </Button>
              {pictureFile && (
                <Box sx={{ mt: 2 }}>
                  <img
                    src={URL.createObjectURL(pictureFile)}
                    alt="Preview"
                    style={{
                      maxWidth: '200px',
                      maxHeight: '200px',
                      objectFit: 'cover',
                      borderRadius: '8px',
                      display: 'block',
                      margin: '8px auto',
                    }}
                  />
                  <Typography variant="caption" sx={{ display: 'block', textAlign: 'center' }}>
                    {pictureFile.name}
                  </Typography>
                </Box>
              )}
              {form.id && officials.find((o) => o.id === form.id)?.picture_path && !pictureFile && (
                <Box sx={{ mt: 2 }}>
                  <img
                    src={`${API_ROOT}${officials.find((o) => o.id === form.id).picture_path}`}
                    alt="Current"
                    style={{
                      maxWidth: '200px',
                      maxHeight: '200px',
                      objectFit: 'cover',
                      borderRadius: '8px',
                      display: 'block',
                      margin: '8px auto',
                    }}
                  />
                  <Typography variant="caption" sx={{ display: 'block', textAlign: 'center' }}>
                    Current picture
                  </Typography>
                </Box>
              )}
            </Grid>
            <Grid item xs={12} md={6}>
              <Button variant="outlined" component="label" fullWidth>
                {signatureFile ? 'Change Signature' : 'Upload Signature'}
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleSignatureFileChange}
                />
              </Button>
              {signatureFile && (
                <Box sx={{ mt: 2 }}>
                  <img
                    src={URL.createObjectURL(signatureFile)}
                    alt="Signature Preview"
                    style={{
                      maxWidth: '200px',
                      maxHeight: '100px',
                      objectFit: 'contain',
                      display: 'block',
                      margin: '8px auto',
                    }}
                  />
                  <Typography variant="caption" sx={{ display: 'block', textAlign: 'center' }}>
                    {signatureFile.name}
                  </Typography>
                </Box>
              )}
              {form.id && officials.find((o) => o.id === form.id)?.signature_path && !signatureFile && (
                <Box sx={{ mt: 2 }}>
                  <img
                    src={`${API_ROOT}${officials.find((o) => o.id === form.id).signature_path}`}
                    alt="Current Signature"
                    style={{
                      maxWidth: '200px',
                      maxHeight: '100px',
                      objectFit: 'contain',
                      display: 'block',
                      margin: '8px auto',
                    }}
                  />
                  <Typography variant="caption" sx={{ display: 'block', textAlign: 'center' }}>
                    Current signature
                  </Typography>
                </Box>
              )}
            </Grid>
            {error && (
              <Grid item xs={12}>
                <Typography color="error" variant="body2">
                  {error}
                </Typography>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Delete Official</DialogTitle>
        <DialogContent dividers>
          <Typography>
            Delete{' '}
            <strong>{toDelete ? toDelete.full_name : 'this official'}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
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

export default OfficialsPage;
