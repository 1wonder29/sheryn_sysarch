// src/pages/HouseholdResidentsPage.jsx
import React, { useEffect, useState, useMemo } from 'react';
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
  Divider,
  Checkbox,
  FormControlLabel,
  InputAdornment,
  CircularProgress,
  Chip,
  Alert,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import SeniorIcon from '@mui/icons-material/AccessibilityNew';
import PWDIcon from '@mui/icons-material/Accessible';
import api from '../api';

const initialResidentForm = {
  last_name: '',
  first_name: '',
  middle_name: '',
  suffix: '',
  nickname: '',
  sex: 'Male',
  birthdate: '',
  civil_status: '',
  employment_status: '',
  registered_voter: '',
  resident_status: 'Resident',
  is_senior_citizen: false,
  is_pwd: false,
  contact_no: '',
  relation_to_head: '',
};

const HouseholdResidentsPage = () => {
  const [households, setHouseholds] = useState([]);
  const [selectedHousehold, setSelectedHousehold] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Household form
  const [householdForm, setHouseholdForm] = useState({
    household_name: '',
    address: '',
    purok: '',
    num_members: 1,
  });

  // Residents array for the household
  const [residents, setResidents] = useState([{ ...initialResidentForm }]);

  // Filters
  const [purokFilter, setPurokFilter] = useState('All');
  const [searchName, setSearchName] = useState('');

  // Edit dialogs
  const [editHouseholdOpen, setEditHouseholdOpen] = useState(false);
  const [editHouseholdData, setEditHouseholdData] = useState(null);
  const [editResidentOpen, setEditResidentOpen] = useState(false);
  const [editResidentData, setEditResidentData] = useState(null);
  const [residentCertificates, setResidentCertificates] = useState([]);
  const [loadingCertificates, setLoadingCertificates] = useState(false);
  const [updating, setUpdating] = useState(false);

  const fetchHouseholds = async () => {
    try {
      setLoading(true);
      const res = await api.get('/households');
      setHouseholds(res.data);
    } catch (err) {
      console.error(err);
      alert('Error fetching households');
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async (householdId) => {
    try {
      const res = await api.get(`/households/${householdId}/members`);
      setMembers(res.data);
    } catch (err) {
      console.error(err);
      alert('Error fetching household members');
    }
  };

  useEffect(() => {
    fetchHouseholds();
  }, []);

  const handleHouseholdFormChange = (e) => {
    const { name, value } = e.target;
    if (name === 'num_members') {
      const num = parseInt(value) || 1;
      const newResidents = Array(num)
        .fill(null)
        .map((_, i) => residents[i] || { ...initialResidentForm });
      setResidents(newResidents);
      setHouseholdForm((prev) => ({ ...prev, [name]: num }));
    } else {
      setHouseholdForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleResidentChange = (index, field, value) => {
    const newResidents = [...residents];
    if (field === 'is_senior_citizen' || field === 'is_pwd') {
      newResidents[index][field] = value;
    } else {
      newResidents[index][field] = value;
    }
    setResidents(newResidents);
  };

  const handleCreateHouseholdWithResidents = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);

      // Validate required fields
      if (!householdForm.household_name || !householdForm.address) {
        alert('Household name and address are required.');
        return;
      }

      // Validate household name and address length
      if (householdForm.household_name.trim().length > 100) {
        alert('Household name must be 100 characters or less.');
        return;
      }
      if (householdForm.address.trim().length > 255) {
        alert('Address must be 255 characters or less.');
        return;
      }

      // Validate residents
      for (let i = 0; i < residents.length; i++) {
        const r = residents[i];
        if (!r.last_name || !r.first_name || !r.sex) {
          alert(`Resident ${i + 1}: Last name, first name, and sex are required.`);
          return;
        }
        if (r.last_name.trim().length > 100) {
          alert(`Resident ${i + 1}: Last name must be 100 characters or less.`);
          return;
        }
        if (r.first_name.trim().length > 100) {
          alert(`Resident ${i + 1}: First name must be 100 characters or less.`);
          return;
        }
      }

      const payload = {
        household_name: householdForm.household_name,
        address: householdForm.address,
        purok: householdForm.purok || null,
        num_members: householdForm.num_members || residents.length,
        residents: residents.map((r) => ({
          ...r,
          address: r.address || householdForm.address,
        })),
      };

      await api.post('/households-with-residents', payload);
      
      // Reset forms
      setHouseholdForm({
        household_name: '',
        address: '',
        purok: '',
        num_members: 1,
      });
      setResidents([{ ...initialResidentForm }]);
      
      await fetchHouseholds();
      alert('Household and residents created successfully!');
    } catch (err) {
      console.error(err);
      const errorMessage = err.response?.data?.message || 'Error creating household with residents';
      alert(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleSelectHousehold = (h) => {
    setSelectedHousehold(h);
    fetchMembers(h.id);
  };

  const handleEditHouseholdClick = (household) => {
    setEditHouseholdData({ ...household });
    setEditHouseholdOpen(true);
  };

  const handleEditHouseholdSave = async () => {
    try {
      setUpdating(true);
      await api.put(`/households/${editHouseholdData.id}`, editHouseholdData);
      setEditHouseholdOpen(false);
      setEditHouseholdData(null);
      fetchHouseholds();
      if (selectedHousehold && selectedHousehold.id === editHouseholdData.id) {
        setSelectedHousehold(editHouseholdData);
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error updating household');
    } finally {
      setUpdating(false);
    }
  };

  const handleEditResidentClick = async (member) => {
    try {
      // Use member data directly since it already contains all resident info
      setEditResidentData({ ...member });
      setEditResidentOpen(true);
      
      // Fetch certificates for this resident
      setLoadingCertificates(true);
      try {
        const res = await api.get(`/residents/${member.resident_id}/certificates`);
        setResidentCertificates(res.data || []);
      } catch (err) {
        console.error('Error fetching certificates:', err);
        setResidentCertificates([]);
      } finally {
        setLoadingCertificates(false);
      }
    } catch (err) {
      console.error(err);
      alert('Error fetching resident data');
    }
  };

  const handleEditResidentSave = async () => {
    try {
      setUpdating(true);
      const residentId = editResidentData.resident_id || editResidentData.id;
      
      // Validation
      if (!editResidentData.last_name || !editResidentData.first_name || !editResidentData.sex) {
        alert('Last name, first name, and sex are required.');
        return;
      }
      
      // Recalculate age if birthdate changed
      if (editResidentData.birthdate) {
        const age = calculateAge(editResidentData.birthdate);
        editResidentData.age = age;
      }
      
      await api.put(`/residents/${residentId}`, editResidentData);
      setEditResidentOpen(false);
      setEditResidentData(null);
      setResidentCertificates([]);
      if (selectedHousehold) {
        fetchMembers(selectedHousehold.id);
      }
      fetchHouseholds();
      alert('Resident updated successfully!');
    } catch (err) {
      console.error(err);
      const errorMessage = err.response?.data?.message || 'Error updating resident';
      alert(errorMessage);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteMember = async (memberId, residentName) => {
    if (!selectedHousehold) return;
    
    if (!window.confirm(`Are you sure you want to remove ${residentName} from this household?`)) {
      return;
    }

    try {
      setUpdating(true);
      await api.delete(`/households/${selectedHousehold.id}/members/${memberId}`);
      await fetchMembers(selectedHousehold.id);
      await fetchHouseholds();
      alert('Member removed successfully!');
    } catch (err) {
      console.error(err);
      const errorMessage = err.response?.data?.message || 'Error removing household member';
      alert(errorMessage);
    } finally {
      setUpdating(false);
    }
  };

  // Filters
  const purokOptions = useMemo(() => {
    const set = new Set();
    households.forEach((h) => {
      if (h.purok) set.add(h.purok);
    });
    return Array.from(set).sort();
  }, [households]);

  const filteredHouseholds = households.filter((h) => {
    const matchPurok = purokFilter === 'All' || h.purok === purokFilter;
    const matchName =
      h.household_name.toLowerCase().includes(searchName.toLowerCase()) ||
      h.address.toLowerCase().includes(searchName.toLowerCase());
    return matchPurok && matchName;
  });

  // Calculate age from birthdate
  const calculateAge = (birthdate) => {
    if (!birthdate) return '';
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Household & Residents
      </Typography>

      <Grid container spacing={3}>
        {/* Left Column: Create Form */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, mb: 3 }} elevation={2}>
            <Typography variant="h6" gutterBottom>
              Create Household with Residents
            </Typography>
            <Box
              component="form"
              onSubmit={handleCreateHouseholdWithResidents}
              noValidate
            >
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    label="Household Name"
                    name="household_name"
                    value={householdForm.household_name}
                    onChange={handleHouseholdFormChange}
                    fullWidth
                    required
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Address"
                    name="address"
                    value={householdForm.address}
                    onChange={handleHouseholdFormChange}
                    fullWidth
                    required
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Purok"
                    name="purok"
                    value={householdForm.purok}
                    onChange={handleHouseholdFormChange}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    type="number"
                    label="Number of Household Members"
                    name="num_members"
                    value={householdForm.num_members}
                    onChange={handleHouseholdFormChange}
                    fullWidth
                    required
                    inputProps={{ min: 1, max: 20 }}
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              <Typography variant="subtitle1" gutterBottom>
                Resident Information
              </Typography>

              {residents.map((resident, index) => (
                <Box key={index} sx={{ mb: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Resident {index + 1}
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <TextField
                        label="Last Name"
                        value={resident.last_name}
                        onChange={(e) =>
                          handleResidentChange(index, 'last_name', e.target.value)
                        }
                        fullWidth
                        required
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        label="First Name"
                        value={resident.first_name}
                        onChange={(e) =>
                          handleResidentChange(index, 'first_name', e.target.value)
                        }
                        fullWidth
                        required
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        label="Middle Name"
                        value={resident.middle_name}
                        onChange={(e) =>
                          handleResidentChange(index, 'middle_name', e.target.value)
                        }
                        fullWidth
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <TextField
                        label="Suffix"
                        value={resident.suffix}
                        onChange={(e) =>
                          handleResidentChange(index, 'suffix', e.target.value)
                        }
                        fullWidth
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <TextField
                        label="Nickname"
                        value={resident.nickname}
                        onChange={(e) =>
                          handleResidentChange(index, 'nickname', e.target.value)
                        }
                        fullWidth
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <TextField
                        select
                        label="Sex"
                        value={resident.sex}
                        onChange={(e) =>
                          handleResidentChange(index, 'sex', e.target.value)
                        }
                        fullWidth
                        required
                        size="small"
                      >
                        <MenuItem value="Male">Male</MenuItem>
                        <MenuItem value="Female">Female</MenuItem>
                        <MenuItem value="Other">Other</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <TextField
                        type="date"
                        label="Date of Birth"
                        value={resident.birthdate}
                        onChange={(e) => {
                          handleResidentChange(index, 'birthdate', e.target.value);
                        }}
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        size="small"
                        InputProps={{
                          endAdornment: resident.birthdate && (
                            <InputAdornment position="end">
                              <Chip
                                label={`Age: ${calculateAge(resident.birthdate)}`}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <TextField
                        select
                        label="Civil Status"
                        value={resident.civil_status}
                        onChange={(e) =>
                          handleResidentChange(index, 'civil_status', e.target.value)
                        }
                        fullWidth
                        size="small"
                      >
                        <MenuItem value="">None</MenuItem>
                        <MenuItem value="Single">Single</MenuItem>
                        <MenuItem value="Married">Married</MenuItem>
                        <MenuItem value="Widowed">Widowed</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <TextField
                        select
                        label="Employment Status"
                        value={resident.employment_status}
                        onChange={(e) =>
                          handleResidentChange(index, 'employment_status', e.target.value)
                        }
                        fullWidth
                        size="small"
                      >
                        <MenuItem value="">None</MenuItem>
                        <MenuItem value="With work">With work</MenuItem>
                        <MenuItem value="Without work">Without work</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <TextField
                        select
                        label="Registered Voter"
                        value={resident.registered_voter}
                        onChange={(e) =>
                          handleResidentChange(index, 'registered_voter', e.target.value)
                        }
                        fullWidth
                        size="small"
                      >
                        <MenuItem value="">None</MenuItem>
                        <MenuItem value="Yes">Yes</MenuItem>
                        <MenuItem value="No">No</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <TextField
                        select
                        label="Resident Status"
                        value={resident.resident_status}
                        onChange={(e) =>
                          handleResidentChange(index, 'resident_status', e.target.value)
                        }
                        fullWidth
                        size="small"
                      >
                        <MenuItem value="Resident">Resident</MenuItem>
                        <MenuItem value="Transferred">Transferred</MenuItem>
                        <MenuItem value="Non-resident">Non-resident</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        label="Contact Number"
                        value={resident.contact_no}
                        onChange={(e) =>
                          handleResidentChange(index, 'contact_no', e.target.value)
                        }
                        fullWidth
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        select
                        label="Relation to Head"
                        value={resident.relation_to_head || ''}
                        onChange={(e) =>
                          handleResidentChange(index, 'relation_to_head', e.target.value)
                        }
                        fullWidth
                        size="small"
                      >
                        <MenuItem value="">None</MenuItem>
                        <MenuItem value="Head">Head</MenuItem>
                        <MenuItem value="Spouse">Spouse</MenuItem>
                        <MenuItem value="Child">Child</MenuItem>
                        <MenuItem value="Parent">Parent</MenuItem>
                        <MenuItem value="Sibling">Sibling</MenuItem>
                        <MenuItem value="Grandchild">Grandchild</MenuItem>
                        <MenuItem value="Grandparent">Grandparent</MenuItem>
                        <MenuItem value="Self">Self</MenuItem>
                        <MenuItem value="Other">Other</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        label="Address (if different)"
                        value={resident.address}
                        onChange={(e) =>
                          handleResidentChange(index, 'address', e.target.value)
                        }
                        fullWidth
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={resident.is_senior_citizen}
                            onChange={(e) =>
                              handleResidentChange(
                                index,
                                'is_senior_citizen',
                                e.target.checked
                              )
                            }
                          />
                        }
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <SeniorIcon fontSize="small" />
                            <span>Senior Citizen</span>
                          </Box>
                        }
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={resident.is_pwd}
                            onChange={(e) =>
                              handleResidentChange(index, 'is_pwd', e.target.checked)
                            }
                          />
                        }
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <PWDIcon fontSize="small" />
                            <span>PWD</span>
                          </Box>
                        }
                      />
                    </Grid>
                  </Grid>
                </Box>
              ))}

              <Button type="submit" variant="contained" disabled={saving} fullWidth>
                {saving ? 'Creating...' : 'Create Household with Residents'}
              </Button>
            </Box>
          </Paper>

          {/* Household List */}
          <Paper sx={{ p: 2 }} elevation={2}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
                mb: 2,
              }}
            >
              <Typography variant="h6">Household List</Typography>
              <TextField
                size="small"
                label="Search (household / address)"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
              <FormControl size="small">
                <InputLabel>Purok</InputLabel>
                <Select
                  label="Purok"
                  value={purokFilter}
                  onChange={(e) => setPurokFilter(e.target.value)}
                >
                  <MenuItem value="All">All</MenuItem>
                  {purokOptions.map((p) => (
                    <MenuItem key={p} value={p}>
                      {p}
                    </MenuItem>
                  ))}
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
                      <TableCell>Household Name</TableCell>
                      <TableCell>Address</TableCell>
                      <TableCell>Purok</TableCell>
                      <TableCell>Members</TableCell>
                      <TableCell align="center">Actions</TableCell>
                      <TableCell align="center">Select</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredHouseholds.map((h) => (
                      <TableRow
                        key={h.id}
                        hover
                        selected={selectedHousehold?.id === h.id}
                      >
                        <TableCell>{h.id}</TableCell>
                        <TableCell>{h.household_name}</TableCell>
                        <TableCell>{h.address}</TableCell>
                        <TableCell>{h.purok || ''}</TableCell>
                        <TableCell>{h.member_count}</TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={() => handleEditHouseholdClick(h)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                        <TableCell align="center">
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleSelectHousehold(h)}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>

        {/* Right Column: Members View */}
        <Grid item xs={12} md={6}>
          {selectedHousehold ? (
            <Paper sx={{ p: 2 }} elevation={2}>
              <Typography variant="h6" gutterBottom>
                Members of: {selectedHousehold.household_name} (ID:{' '}
                {selectedHousehold.id})
              </Typography>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Full Name</TableCell>
                      <TableCell>Age</TableCell>
                      <TableCell>Civil Status</TableCell>
                      <TableCell>Employment</TableCell>
                      <TableCell>Voter</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Relation</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {members.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>{m.resident_id}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <span>
                              {m.last_name}, {m.first_name} {m.middle_name || ''} {m.suffix || ''}
                              {m.nickname && ` (${m.nickname})`}
                            </span>
                            {m.is_senior_citizen === 1 && (
                              <Chip
                                icon={<SeniorIcon />}
                                label="Senior"
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            )}
                            {m.is_pwd === 1 && (
                              <Chip
                                icon={<PWDIcon />}
                                label="PWD"
                                size="small"
                                color="secondary"
                                variant="outlined"
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>{m.age || '-'}</TableCell>
                        <TableCell>{m.civil_status || '-'}</TableCell>
                        <TableCell>{m.employment_status || '-'}</TableCell>
                        <TableCell>{m.registered_voter || '-'}</TableCell>
                        <TableCell>{m.resident_status || 'Resident'}</TableCell>
                        <TableCell>{m.relation_to_head || '-'}</TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={() => handleEditResidentClick(m)}
                            color="primary"
                            title="Edit resident"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteMember(m.id, `${m.first_name} ${m.last_name}`)}
                            color="error"
                            title="Remove from household"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          ) : (
            <Paper sx={{ p: 2 }} elevation={2}>
              <Typography variant="body1" color="text.secondary">
                Select a household from the left to view and manage members.
              </Typography>
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* Edit Household Dialog */}
      <Dialog
        open={editHouseholdOpen}
        onClose={() => setEditHouseholdOpen(false)}
      >
        <DialogTitle>Edit Household</DialogTitle>
        <DialogContent dividers>
          {editHouseholdData && (
            <Box sx={{ mt: 1 }}>
              <TextField
                sx={{ mb: 2 }}
                label="Household Name"
                name="household_name"
                value={editHouseholdData.household_name}
                onChange={(e) =>
                  setEditHouseholdData({
                    ...editHouseholdData,
                    household_name: e.target.value,
                  })
                }
                fullWidth
              />
              <TextField
                sx={{ mb: 2 }}
                label="Address"
                name="address"
                value={editHouseholdData.address}
                onChange={(e) =>
                  setEditHouseholdData({
                    ...editHouseholdData,
                    address: e.target.value,
                  })
                }
                fullWidth
              />
              <TextField
                label="Purok"
                name="purok"
                value={editHouseholdData.purok || ''}
                onChange={(e) =>
                  setEditHouseholdData({
                    ...editHouseholdData,
                    purok: e.target.value,
                  })
                }
                fullWidth
              />
              <TextField
                type="number"
                label="Number of Household Members"
                name="num_members"
                value={editHouseholdData.num_members || 1}
                onChange={(e) =>
                  setEditHouseholdData({
                    ...editHouseholdData,
                    num_members: parseInt(e.target.value) || 1,
                  })
                }
                fullWidth
                inputProps={{ min: 1, max: 20 }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditHouseholdOpen(false)}>Cancel</Button>
          <Button
            onClick={handleEditHouseholdSave}
            variant="contained"
            disabled={updating}
          >
            {updating ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Resident Dialog */}
      <Dialog
        open={editResidentOpen}
        onClose={() => setEditResidentOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Resident</DialogTitle>
        <DialogContent dividers>
          {editResidentData && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Last Name"
                  name="last_name"
                  value={editResidentData.last_name}
                  onChange={(e) =>
                    setEditResidentData({
                      ...editResidentData,
                      last_name: e.target.value,
                    })
                  }
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="First Name"
                  name="first_name"
                  value={editResidentData.first_name}
                  onChange={(e) =>
                    setEditResidentData({
                      ...editResidentData,
                      first_name: e.target.value,
                    })
                  }
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Middle Name"
                  name="middle_name"
                  value={editResidentData.middle_name || ''}
                  onChange={(e) =>
                    setEditResidentData({
                      ...editResidentData,
                      middle_name: e.target.value,
                    })
                  }
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Suffix"
                  name="suffix"
                  value={editResidentData.suffix || ''}
                  onChange={(e) =>
                    setEditResidentData({
                      ...editResidentData,
                      suffix: e.target.value,
                    })
                  }
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Nickname"
                  name="nickname"
                  value={editResidentData.nickname || ''}
                  onChange={(e) =>
                    setEditResidentData({
                      ...editResidentData,
                      nickname: e.target.value,
                    })
                  }
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  select
                  label="Sex"
                  name="sex"
                  value={editResidentData.sex}
                  onChange={(e) =>
                    setEditResidentData({
                      ...editResidentData,
                      sex: e.target.value,
                    })
                  }
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
                  label="Date of Birth"
                  name="birthdate"
                  value={editResidentData.birthdate || ''}
                  onChange={(e) => {
                    const newBirthdate = e.target.value;
                    const age = calculateAge(newBirthdate);
                    setEditResidentData({
                      ...editResidentData,
                      birthdate: newBirthdate,
                      age: age,
                    });
                  }}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  InputProps={{
                    endAdornment: editResidentData.birthdate && (
                      <InputAdornment position="end">
                        <Chip
                          label={`Age: ${calculateAge(editResidentData.birthdate)}`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  select
                  label="Civil Status"
                  name="civil_status"
                  value={editResidentData.civil_status || ''}
                  onChange={(e) =>
                    setEditResidentData({
                      ...editResidentData,
                      civil_status: e.target.value,
                    })
                  }
                  fullWidth
                >
                  <MenuItem value="">None</MenuItem>
                  <MenuItem value="Single">Single</MenuItem>
                  <MenuItem value="Married">Married</MenuItem>
                  <MenuItem value="Widowed">Widowed</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  select
                  label="Employment Status"
                  name="employment_status"
                  value={editResidentData.employment_status || ''}
                  onChange={(e) =>
                    setEditResidentData({
                      ...editResidentData,
                      employment_status: e.target.value,
                    })
                  }
                  fullWidth
                >
                  <MenuItem value="">None</MenuItem>
                  <MenuItem value="With work">With work</MenuItem>
                  <MenuItem value="Without work">Without work</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  select
                  label="Registered Voter"
                  name="registered_voter"
                  value={editResidentData.registered_voter || ''}
                  onChange={(e) =>
                    setEditResidentData({
                      ...editResidentData,
                      registered_voter: e.target.value,
                    })
                  }
                  fullWidth
                >
                  <MenuItem value="">None</MenuItem>
                  <MenuItem value="Yes">Yes</MenuItem>
                  <MenuItem value="No">No</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  select
                  label="Resident Status"
                  name="resident_status"
                  value={editResidentData.resident_status || 'Resident'}
                  onChange={(e) =>
                    setEditResidentData({
                      ...editResidentData,
                      resident_status: e.target.value,
                    })
                  }
                  fullWidth
                >
                  <MenuItem value="Resident">Resident</MenuItem>
                  <MenuItem value="Transferred">Transferred</MenuItem>
                  <MenuItem value="Non-resident">Non-resident</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Contact Number"
                  name="contact_no"
                  value={editResidentData.contact_no || ''}
                  onChange={(e) =>
                    setEditResidentData({
                      ...editResidentData,
                      contact_no: e.target.value,
                    })
                  }
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  select
                  label="Relation to Head"
                  name="relation_to_head"
                  value={editResidentData.relation_to_head || ''}
                  onChange={(e) =>
                    setEditResidentData({
                      ...editResidentData,
                      relation_to_head: e.target.value,
                    })
                  }
                  fullWidth
                >
                  <MenuItem value="">None</MenuItem>
                  <MenuItem value="Head">Head</MenuItem>
                  <MenuItem value="Spouse">Spouse</MenuItem>
                  <MenuItem value="Child">Child</MenuItem>
                  <MenuItem value="Parent">Parent</MenuItem>
                  <MenuItem value="Sibling">Sibling</MenuItem>
                  <MenuItem value="Grandchild">Grandchild</MenuItem>
                  <MenuItem value="Grandparent">Grandparent</MenuItem>
                  <MenuItem value="Self">Self</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Address"
                  name="address"
                  value={editResidentData.address || ''}
                  onChange={(e) =>
                    setEditResidentData({
                      ...editResidentData,
                      address: e.target.value,
                    })
                  }
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={editResidentData.is_senior_citizen === 1}
                      onChange={(e) =>
                        setEditResidentData({
                          ...editResidentData,
                          is_senior_citizen: e.target.checked ? 1 : 0,
                        })
                      }
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <SeniorIcon fontSize="small" />
                      <span>Senior Citizen</span>
                    </Box>
                  }
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={editResidentData.is_pwd === 1}
                      onChange={(e) =>
                        setEditResidentData({
                          ...editResidentData,
                          is_pwd: e.target.checked ? 1 : 0,
                        })
                      }
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PWDIcon fontSize="small" />
                      <span>PWD</span>
                    </Box>
                  }
                />
              </Grid>

              {/* Certificate History Section */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Certificate Requests
                </Typography>
                {loadingCertificates ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : residentCertificates.length === 0 ? (
                  <Alert severity="info">No certificate requests found for this resident.</Alert>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Certificate Type</TableCell>
                          <TableCell>Date Requested</TableCell>
                          <TableCell>Purpose</TableCell>
                          <TableCell>OR Number</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {residentCertificates.map((cert) => (
                          <TableRow key={cert.id}>
                            <TableCell>
                              <Chip
                                label={cert.certificate_type}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              {new Date(cert.issue_date).toLocaleDateString('en-PH', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </TableCell>
                            <TableCell>{cert.purpose || '-'}</TableCell>
                            <TableCell>{cert.or_number || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setEditResidentOpen(false);
              setEditResidentData(null);
              setResidentCertificates([]);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleEditResidentSave}
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

export default HouseholdResidentsPage;
